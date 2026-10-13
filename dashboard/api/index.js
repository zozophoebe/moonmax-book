import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { del, get, list, put } from "@vercel/blob";
//#region server/auth.ts
var COOKIE = "mm_session";
var MAX_AGE_S = 2592e3;
var mac = (secret, exp, binding) => createHmac("sha256", secret).update(`moonmax-session:${exp}:${binding}`).digest("hex");
function verifySession(cookieHeader, secret, binding) {
	const [expStr, sig] = ((cookieHeader ?? "").split(";").map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`))?.slice(11) ?? "").split(".");
	const exp = Number(expStr);
	if (!sig || !Number.isFinite(exp) || exp * 1e3 < Date.now()) return false;
	const a = Buffer.from(sig);
	const b = Buffer.from(mac(secret, exp, binding));
	return a.length === b.length && timingSafeEqual(a, b);
}
function sessionCookie(secret, binding, secure) {
	const exp = Math.floor(Date.now() / 1e3) + MAX_AGE_S;
	return `${COOKIE}=${exp}.${mac(secret, exp, binding)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE_S}${secure ? "; Secure" : ""}`;
}
var clearedCookie = (secure) => `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`;
//#endregion
//#region server/http.ts
async function fetchWithTimeout(url, init = {}, ms = 1e4) {
	return fetch(url, {
		...init,
		signal: AbortSignal.timeout(ms),
		headers: {
			"user-agent": "moonmax-book-dev/0.1",
			...init.headers
		}
	});
}
//#endregion
//#region server/google.ts
var OWNER_KEY = "owner.local";
var loadOwner = (storage) => storage.get(OWNER_KEY);
var saveOwner = (storage, owner) => storage.set(OWNER_KEY, owner);
var ownerBinding = (o) => `google:${o.sub}:${o.claimedAt}`;
var OAUTH_COOKIE = "mm_oauth";
var ISSUERS = /* @__PURE__ */ new Set(["https://accounts.google.com", "accounts.google.com"]);
function newOauthState() {
	return {
		state: randomBytes(24).toString("base64url"),
		nonce: randomBytes(24).toString("base64url")
	};
}
var oauthCookie = (state, nonce, secure) => `${OAUTH_COOKIE}=${state}.${nonce}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=600${secure ? "; Secure" : ""}`;
var clearedOauthCookie = (secure) => `${OAUTH_COOKIE}=; Path=/api; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
function readOauthCookie(cookieHeader) {
	const [state, nonce] = ((cookieHeader ?? "").split(";").map((c) => c.trim()).find((c) => c.startsWith(`${OAUTH_COOKIE}=`))?.slice(9) ?? "").split(".");
	return state && nonce ? {
		state,
		nonce
	} : null;
}
function authorizeUrl(cfg, redirectUri, state, nonce) {
	return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
		client_id: cfg.clientId,
		redirect_uri: redirectUri,
		response_type: "code",
		scope: "openid email",
		state,
		nonce,
		prompt: "select_account"
	})}`;
}
var GoogleLoginError = class extends Error {
	code;
	constructor(code) {
		super(code);
		this.code = code;
	}
};
async function exchangeCode(cfg, code, redirectUri, nonce) {
	const res = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			code,
			client_id: cfg.clientId,
			client_secret: cfg.clientSecret,
			redirect_uri: redirectUri,
			grant_type: "authorization_code"
		}).toString()
	});
	if (!res.ok) throw new GoogleLoginError("exchange");
	const { id_token: idToken } = await res.json();
	const payload = idToken?.split(".")[1];
	if (!payload) throw new GoogleLoginError("token");
	const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
	if (!claims.iss || !ISSUERS.has(claims.iss) || claims.aud !== cfg.clientId || !claims.exp || claims.exp * 1e3 < Date.now() || !claims.sub) throw new GoogleLoginError("token");
	if (claims.nonce !== nonce) throw new GoogleLoginError("nonce");
	if (!claims.email || claims.email_verified !== true) throw new GoogleLoginError("unverified");
	return {
		sub: claims.sub,
		email: claims.email
	};
}
//#endregion
//#region server/config.ts
async function loadConfig(storage) {
	const raw = await storage.get("config");
	if (!raw) return {
		paylinks: [],
		maxDepositAddresses: []
	};
	return {
		paylinks: raw.paylinks ?? (raw.paylinkId ? [{
			id: raw.paylinkId,
			label: null,
			siteUrl: raw.siteUrl ?? null,
			addedAt: (/* @__PURE__ */ new Date()).toISOString()
		}] : []),
		maxDepositAddresses: raw.maxDepositAddresses ?? []
	};
}
async function saveConfig(storage, config) {
	await storage.set("config", {
		paylinks: config.paylinks,
		maxDepositAddresses: config.maxDepositAddresses
	});
}
function parsePaylinkId(input) {
	return input.trim().match(/\b([a-f0-9]{24})\b/i)?.[1]?.toLowerCase() ?? null;
}
function isSolanaAddress(input) {
	return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input.trim());
}
function normalizeUrl(input) {
	try {
		const url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
		return url.protocol === "https:" || url.hostname === "localhost" ? url.toString().replace(/\/$/, "") : null;
	} catch {
		return null;
	}
}
function cleanLabel(input) {
	return (typeof input === "string" ? input.trim().slice(0, 40) : "") || null;
}
//#endregion
//#region server/i18n.ts
var T = (zh, en) => ({
	zh,
	en
});
var pick = (lang, t) => lang === "en" ? t.en : t.zh;
var langOf = (req) => req.headers.get("x-moonmax-lang") === "en" ? "en" : "zh";
var LocalizedError = class extends Error {
	text;
	constructor(text) {
		super(text.en);
		this.text = text;
	}
};
var errorText = (lang, e, fallback) => e instanceof LocalizedError ? pick(lang, e.text) : `${pick(lang, fallback)}${e instanceof Error && e.message ? `（${e.message}）` : ""}`;
//#endregion
//#region server/store.ts
var SECRET_KEY = "webhook.local";
var loadWebhookSecret = (storage) => storage.get(SECRET_KEY);
var saveWebhookSecret = (storage, sharedToken) => storage.set(SECRET_KEY, {
	sharedToken,
	savedAt: (/* @__PURE__ */ new Date()).toISOString()
});
var clearWebhookSecret = (storage) => storage.del([SECRET_KEY]);
var eventKey = (signature) => `events/${signature.replace(/[^A-Za-z0-9_-]/g, "_")}`;
async function loadWebhookEvents(storage) {
	const keys = await storage.list("events/");
	return (await Promise.all(keys.map((k) => storage.get(k)))).filter((e) => e !== null);
}
var saveWebhookEvent = (storage, event) => storage.set(eventKey(event.transactionSignature), event);
async function resetAll(storage) {
	await storage.del([
		"config",
		SECRET_KEY,
		OWNER_KEY,
		"auth.local",
		"max.funds",
		...await storage.list("events/")
	]);
}
var loadCache = async (storage, name, fallback) => await storage.get(`${name}.cache`) ?? fallback;
var saveCache = (storage, name, value) => storage.set(`${name}.cache`, value);
//#endregion
//#region server/chain.ts
var RPC = "https://api.mainnet-beta.solana.com";
var SOLANA_USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
var SOLANA_USDT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
var MINTS = {
	[SOLANA_USDC]: "USDC",
	[SOLANA_USDT]: "USDT"
};
var SIGNATURE_LIMIT = 200;
async function rpc(method, params) {
	for (let attempt = 0;; attempt++) {
		const res = await fetchWithTimeout(RPC, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method,
				params
			})
		});
		if (res.status === 429 && attempt < 4) {
			await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
			continue;
		}
		if (!res.ok) throw new LocalizedError(T(`Solana 節點回應 HTTP ${res.status}`, `The Solana node responded with HTTP ${res.status}`));
		const body = await res.json();
		if (body.error) throw new LocalizedError(T(`Solana 節點：${body.error.message ?? "未知錯誤"}`, `Solana node: ${body.error.message ?? "unknown error"}`));
		return body.result;
	}
}
function parseTx(tx) {
	if (!tx?.meta || tx.meta.err || !tx.blockTime) return null;
	const deltas = /* @__PURE__ */ new Map();
	const add = (b, sign) => {
		const token = MINTS[b.mint];
		if (!token || !b.owner) return;
		const byOwner = deltas.get(token) ?? /* @__PURE__ */ new Map();
		byOwner.set(b.owner, (byOwner.get(b.owner) ?? 0n) + sign * BigInt(b.uiTokenAmount.amount));
		deltas.set(token, byOwner);
	};
	for (const b of tx.meta.preTokenBalances ?? []) add(b, -1n);
	for (const b of tx.meta.postTokenBalances ?? []) add(b, 1n);
	const viaMoonPay = tx.transaction.message.accountKeys.map((k) => typeof k === "string" ? k : k.pubkey).includes("ENicYBBNZQ91toN7ggmTxnDGZW14uv9UkumN7XBGeYJ4") || (tx.meta.logMessages ?? []).some((l) => l.includes("ENicYBBNZQ91toN7ggmTxnDGZW14uv9UkumN7XBGeYJ4"));
	return {
		at: (/* @__PURE__ */ new Date(tx.blockTime * 1e3)).toISOString(),
		viaMoonPay,
		deltas: Object.fromEntries([...deltas].map(([token, byOwner]) => [token, Object.fromEntries([...byOwner].filter(([, v]) => v !== 0n).map(([k, v]) => [k, v.toString()]))]))
	};
}
function toTransfer(signature, wallet, p, token) {
	const byOwner = p.deltas[token] ?? {};
	const own = BigInt(byOwner[wallet] ?? "0");
	if (own === 0n) return null;
	const others = Object.entries(byOwner).filter(([owner]) => owner !== wallet).map(([owner, v]) => [owner, BigInt(v)]);
	if (own > 0n) {
		const senders = others.filter(([, v]) => v < 0n).sort((a, b) => a[1] < b[1] ? -1 : 1);
		const paid = senders.reduce((s, [, v]) => s - v, 0n);
		const fee = others.filter(([, v]) => v > 0n).reduce((s, [, v]) => s + v, 0n);
		return {
			signature,
			at: p.at,
			wallet,
			token,
			direction: "in",
			amountUnits: own,
			viaMoonPay: p.viaMoonPay,
			payerPaidUnits: p.viaMoonPay && paid > 0n ? paid : null,
			feeUnits: p.viaMoonPay ? fee : null,
			counterparty: senders[0]?.[0] ?? null
		};
	}
	const receivers = others.filter(([, v]) => v > 0n).sort((a, b) => a[1] > b[1] ? -1 : 1);
	return {
		signature,
		at: p.at,
		wallet,
		token,
		direction: "out",
		amountUnits: -own,
		viaMoonPay: p.viaMoonPay,
		payerPaidUnits: null,
		feeUnits: null,
		counterparty: receivers[0]?.[0] ?? null
	};
}
var recent = /* @__PURE__ */ new Map();
async function readSolanaWallet(storage, wallet) {
	const hit = recent.get(wallet);
	if (hit && Date.now() - hit.at < 6e4) return hit.transfers;
	const signatures = /* @__PURE__ */ new Set();
	const accounts = [];
	for (const mint of Object.keys(MINTS)) accounts.push(...(await rpc("getTokenAccountsByOwner", [
		wallet,
		{ mint },
		{ encoding: "jsonParsed" }
	])).value);
	for (const { pubkey } of accounts) {
		const sigs = await rpc("getSignaturesForAddress", [pubkey, { limit: SIGNATURE_LIMIT }]);
		for (const s of sigs) if (!s.err) signatures.add(s.signature);
	}
	const cache = await loadCache(storage, "solana-tx-v2", {});
	const missing = [...signatures].filter((s) => !cache[s]);
	let added = 0;
	for (const sig of missing) {
		const parsed = parseTx(await rpc("getTransaction", [sig, {
			encoding: "jsonParsed",
			maxSupportedTransactionVersion: 0,
			commitment: "finalized"
		}]));
		if (parsed) {
			cache[sig] = parsed;
			added += 1;
		}
	}
	if (added) await saveCache(storage, "solana-tx-v2", cache);
	const transfers = [...signatures].flatMap((sig) => {
		const p = cache[sig];
		return p ? ["USDC", "USDT"].map((token) => toTransfer(sig, wallet, p, token)) : [];
	}).filter((t) => t !== null).sort((a, b) => b.at.localeCompare(a.at));
	recent.set(wallet, {
		at: Date.now(),
		transfers
	});
	return transfers;
}
var solscanTx = (signature) => `https://solscan.io/tx/${signature}`;
//#endregion
//#region server/fx.ts
var FX_SOURCE = "currency-api";
var RATE_DP$1 = 4;
var taipeiDate = (iso, minusDays = 0) => (/* @__PURE__ */ new Date(Date.parse(iso) + 288e5 - minusDays * 864e5)).toISOString().slice(0, 10);
async function fetchRate(date) {
	try {
		const res = await fetchWithTimeout(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/usd.min.json`, {}, 8e3);
		if (!res.ok) return null;
		const body = await res.json();
		return typeof body.usd?.twd === "number" ? body.usd.twd.toFixed(RATE_DP$1) : null;
	} catch {
		return null;
	}
}
async function ratesFor(storage, isoTimes) {
	const cache = await loadCache(storage, "fx", {});
	let changed = false;
	const out = /* @__PURE__ */ new Map();
	for (const iso of isoTimes) {
		const day = taipeiDate(iso);
		if (!(day in cache)) {
			let rate = null;
			for (let back = 0; back < 4 && !rate; back++) rate = await fetchRate(taipeiDate(iso, back));
			if (rate) {
				cache[day] = rate;
				changed = true;
			}
		}
		out.set(iso, cache[day] ?? null);
	}
	if (changed) await saveCache(storage, "fx", cache);
	return out;
}
function twdValue(grossUnits, tokenDecimals, rate) {
	const [int = "0", frac = ""] = rate.split(".");
	const rateScaled = BigInt(int + frac.padEnd(RATE_DP$1, "0").slice(0, RATE_DP$1));
	const scale = 10n ** BigInt(tokenDecimals + RATE_DP$1);
	return ((grossUnits * rateScaled + scale / 2n) / scale).toString();
}
//#endregion
//#region server/money.ts
function toUnits(decimal, decimals) {
	const [int = "0", frac = ""] = decimal.replace(/,/g, "").trim().split(".");
	const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
	return BigInt(int || "0") * 10n ** BigInt(decimals) + BigInt(padded || "0");
}
function unitsToDecimal(units, decimals, dp = 2) {
	if (dp >= decimals) {
		const s = units.toString().padStart(decimals + 1, "0");
		const out = decimals === 0 ? s : `${s.slice(0, -decimals)}.${s.slice(-decimals)}`;
		return dp > decimals ? out + "0".repeat(dp - decimals) : out;
	}
	const scale = 10n ** BigInt(decimals - dp);
	const s = ((units + scale / 2n) / scale).toString().padStart(dp + 1, "0");
	return dp === 0 ? s : `${s.slice(0, -dp)}.${s.slice(-dp)}`;
}
function tokenString(units, decimals, min = 2) {
	const [int = "0", frac = ""] = unitsToDecimal(units, decimals, decimals).split(".");
	return `${int}.${frac.replace(/0+$/, "").padEnd(min, "0")}`;
}
//#endregion
//#region server/moonpay.ts
var MOONPAY_API = "https://api.hel.io/v1";
var PaylinkNotFound = class extends LocalizedError {
	constructor() {
		super(T("MoonPay 找不到這個 Pay Link。", "MoonPay could not find this Pay Link."));
	}
};
var memo = /* @__PURE__ */ new Map();
async function fetchPublicPaylink(id) {
	const hit = memo.get(id);
	if (hit && Date.now() - hit.at < 3e4) return hit.value;
	const res = await fetchWithTimeout(`${MOONPAY_API}/paylink/${id}/public`);
	if (res.status === 404 || res.status === 400) throw new PaylinkNotFound();
	if (!res.ok) throw new LocalizedError(T(`MoonPay 回應 HTTP ${res.status}`, `MoonPay responded with HTTP ${res.status}`));
	const body = await res.json().catch(() => null);
	if (!body || typeof body.name !== "string" || !body.currency) throw new PaylinkNotFound();
	memo.set(id, {
		at: Date.now(),
		value: body
	});
	return body;
}
function recipientsOf(pl) {
	const out = [];
	for (const r of pl.recipients ?? []) {
		const address = r.wallet?.publicKey;
		if (!address) continue;
		out.push({
			chain: r.currency?.blockchain?.displayName ?? "—",
			engine: r.sourceBlockchainEngine?.type ?? "?",
			token: r.currency?.symbol ?? "?",
			address
		});
	}
	if (!out.length && pl.wallet?.publicKey) out.push({
		chain: pl.currency.blockchain?.displayName ?? "—",
		engine: "SOL",
		token: pl.currency.symbol,
		address: pl.wallet.publicKey
	});
	return out;
}
function toPreview(id, pl) {
	return {
		id,
		name: pl.name,
		priceToken: unitsToDecimal(BigInt(pl.normalizedPrice), pl.currency.decimals),
		token: pl.currency.symbol,
		chain: pl.currency.blockchain?.displayName ?? "—",
		active: !pl.disabled && !pl.inactive,
		hostedUrl: `https://moonpay.hel.io/pay/${id}`,
		redirectUrl: pl.redirectUrl,
		requireEmail: pl.features.requireEmail,
		canSwapTokens: pl.features.canSwapTokens,
		canPayWithCard: pl.features.canPayWithCard,
		companyName: pl.company?.name ?? null,
		kycVerified: Boolean(pl.company?.kycVerified),
		kybVerified: Boolean(pl.company?.kybVerified),
		recipients: recipientsOf(pl)
	};
}
function safeEqual(a, b) {
	const x = Buffer.from(a);
	const y = Buffer.from(b);
	return x.length === y.length && timingSafeEqual(x, y);
}
function verifyWebhook(rawBody, authorization, signature, sharedToken) {
	const bearer = safeEqual(authorization ?? "", `Bearer ${sharedToken}`);
	const expected = createHmac("sha256", sharedToken).update(rawBody).digest("hex");
	const signed = safeEqual((signature ?? "").toLowerCase(), expected);
	return bearer && signed;
}
function extractWebhookEvent(body) {
	let tx = body.transactionObject;
	if (!tx && typeof body.transaction === "string") try {
		tx = JSON.parse(body.transaction);
	} catch {
		tx = void 0;
	}
	const meta = tx?.meta;
	if (!tx || !meta?.transactionSignature || meta.transactionStatus && meta.transactionStatus !== "SUCCESS") return null;
	return {
		transactionSignature: meta.transactionSignature,
		helioTransactionId: tx.id ?? null,
		paylinkId: tx.paylinkId ?? null,
		chainSymbol: meta.currency?.blockchain?.symbol ?? null,
		tokenSymbol: meta.currency?.symbol ?? null,
		amountUnits: meta.totalAmount ?? meta.amount ?? null,
		feeUnits: tx.fee ?? null,
		recipient: meta.recipientPK ?? null,
		createdAt: tx.createdAt ?? null,
		receivedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
}
//#endregion
//#region server/max.ts
var KEY = "max.funds";
var DECIMALS = 6;
var STABLES = /* @__PURE__ */ new Set(["USDC", "USDT"]);
var loadStore = async (storage) => await storage.get(KEY) ?? {
	records: [],
	files: []
};
var clearMax = (storage) => storage.del([KEY]);
var maxTxids = async (storage) => new Set((await loadStore(storage)).records.map((r) => r.txid));
var recordKey = (r) => `${r.txid}|${r.currency}|${r.amount}`;
async function maxImportStatus(storage) {
	const s = await loadStore(storage);
	return {
		files: s.files.length,
		records: s.records.length,
		lastImportedAt: s.files.reduce((m, f) => !m || f.importedAt > m ? f.importedAt : m, null)
	};
}
function parseCsv(text) {
	const rows = [];
	let row = [];
	let cell = "";
	let quoted = false;
	const src = text.replace(/^﻿/, "");
	for (let i = 0; i < src.length; i++) {
		const ch = src[i];
		if (quoted) {
			if (ch === "\"" && src[i + 1] === "\"") {
				cell += "\"";
				i++;
			} else if (ch === "\"") quoted = false;
			else cell += ch;
		} else if (ch === "\"") quoted = true;
		else if (ch === ",") {
			row.push(cell);
			cell = "";
		} else if (ch === "\n" || ch === "\r") {
			if (ch === "\r" && src[i + 1] === "\n") i++;
			row.push(cell);
			if (row.some((c) => c.trim())) rows.push(row);
			row = [];
			cell = "";
		} else cell += ch;
	}
	row.push(cell);
	if (row.some((c) => c.trim())) rows.push(row);
	return rows;
}
var HEADERS = {
	at: [
		"date",
		"time",
		"datetime",
		"日期",
		"時間"
	],
	currency: [
		"currency",
		"coin",
		"asset",
		"幣別",
		"幣種",
		"幣"
	],
	amount: [
		"amount",
		"volume",
		"quantity",
		"數量",
		"金額"
	],
	txid: [
		"txid",
		"tx id",
		"txhash",
		"tx hash",
		"transaction id",
		"交易id",
		"交易編號",
		"交易序號"
	],
	status: ["status", "狀態"]
};
function toIso(raw) {
	const m = raw.trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(Z|[+-]\d{2}:?\d{2})?$/);
	if (!m) return null;
	const [, y, mo, d, h, mi, s = "00", tz = "+0800"] = m;
	const zone = tz === "Z" ? "Z" : `${tz.slice(0, 3)}:${tz.slice(-2)}`;
	const t = Date.parse(`${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${mi}:${s}${zone}`);
	return Number.isFinite(t) ? new Date(t).toISOString() : null;
}
async function importMaxCsv(storage, fileName, text) {
	const rows = parseCsv(text);
	const header = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
	const col = (k) => header.findIndex((h) => HEADERS[k].includes(h));
	const idx = {
		at: col("at"),
		currency: col("currency"),
		amount: col("amount"),
		txid: col("txid"),
		status: col("status")
	};
	if (idx.at < 0 || idx.currency < 0 || idx.amount < 0 || idx.txid < 0) throw new LocalizedError(T(`看不懂這個 CSV 的欄位（${(rows[0] ?? []).join(", ") || "空的"}）。目前支援 MAX 的「資金紀錄」匯出：Date, Currency, Amount, Txid, Status。`, `Can’t read this CSV’s columns (${(rows[0] ?? []).join(", ") || "empty"}). Supported for now: MAX’s funds-history export — Date, Currency, Amount, Txid, Status.`));
	const store = await loadStore(storage);
	const known = new Set(store.records.map(recordKey));
	let added = 0;
	let duplicates = 0;
	let skipped = 0;
	for (const r of rows.slice(1)) {
		const txid = (r[idx.txid] ?? "").trim();
		const at = toIso(r[idx.at] ?? "");
		const amount = (r[idx.amount] ?? "").trim().replace(/,/g, "");
		if (!txid || !at || !/^-?\d+(\.\d+)?$/.test(amount)) {
			skipped++;
			continue;
		}
		const currency = (r[idx.currency] ?? "").trim().toUpperCase();
		const key = recordKey({
			txid,
			currency,
			amount
		});
		if (known.has(key)) {
			duplicates++;
			continue;
		}
		known.add(key);
		store.records.push({
			txid,
			at,
			currency,
			amount,
			status: idx.status >= 0 ? (r[idx.status] ?? "").trim().toLowerCase() : "done",
			file: fileName
		});
		added++;
	}
	store.files = [...store.files.filter((f) => f.name !== fileName), {
		name: fileName,
		rows: rows.length - 1,
		importedAt: (/* @__PURE__ */ new Date()).toISOString()
	}];
	await storage.set(KEY, store);
	return {
		added,
		duplicates,
		skipped,
		total: store.records.length
	};
}
async function payersOf(storage, txids) {
	const cache = await loadCache(storage, "solana-payer", {});
	let changed = false;
	for (const sig of txids) {
		if (cache[sig] !== void 0) continue;
		try {
			const body = await (await fetchWithTimeout("https://api.mainnet-beta.solana.com", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 1,
					method: "getTransaction",
					params: [sig, {
						encoding: "jsonParsed",
						maxSupportedTransactionVersion: 0
					}]
				})
			})).json();
			const keys = body.result?.transaction.message.accountKeys ?? [];
			if (!body.result) continue;
			cache[sig] = { payer: keys.find((k) => k.signer)?.pubkey ?? keys[0]?.pubkey ?? null };
			changed = true;
		} catch {}
	}
	if (changed) await saveCache(storage, "solana-payer", cache);
	return cache;
}
var RATE_DP = 4n;
var rateScaled = (rate) => {
	const [i = "0", f = ""] = rate.split(".");
	return BigInt(i + f.padEnd(Number(RATE_DP), "0").slice(0, Number(RATE_DP)));
};
var centsOf = (units, rate) => {
	const scale = 10n ** (BigInt(DECIMALS) + RATE_DP - 2n);
	return (units * rateScaled(rate) + scale / 2n) / scale;
};
var twd = (cents) => {
	const neg = cents < 0n;
	const a = neg ? -cents : cents;
	return `${neg ? "-" : ""}${a / 100n}.${(a % 100n).toString().padStart(2, "0")}`;
};
async function reconcile(storage, config, lang) {
	const store = await loadStore(storage);
	const view = await buildReceipts(storage, config, lang);
	const receiving = new Set(view.wallets.map((w) => w.address));
	const outgoing = new Map(view.outgoing.map((o) => [o.id, o]));
	const lots = /* @__PURE__ */ new Map();
	for (const r of [...view.receipts].filter((r) => r.sourceKey !== "other" && r.fxRateTwdPerUsd).sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))) {
		const qty = toUnits(r.netToken, DECIMALS);
		const lot = {
			receiptId: r.id,
			receivedAt: r.receivedAt,
			sourceKey: r.sourceKey,
			token: r.token,
			left: qty,
			qty,
			costCents: centsOf(qty, r.fxRateTwdPerUsd),
			rate: r.fxRateTwdPerUsd
		};
		lots.set(r.token, [...lots.get(r.token) ?? [], lot]);
	}
	const records = [...store.records].sort((a, b) => a.at.localeCompare(b.at));
	const unknown = [...new Set(records.filter((d) => !outgoing.has(d.txid)).map((d) => d.txid))];
	const payers = unknown.length ? await payersOf(storage, unknown) : {};
	const rates = await ratesFor(storage, records.map((d) => d.at));
	const rows = [];
	let costTotal = 0n;
	let valueTotal = 0n;
	let matchedTotal = 0n;
	let valueComplete = true;
	const extras = /* @__PURE__ */ new Map();
	const addExtra = (currency, amount) => extras.set(currency, [...extras.get(currency) ?? [], amount]);
	const sumDecimals = (xs) => {
		const dp = Math.max(2, ...xs.map((x) => x.split(".")[1]?.length ?? 0));
		return tokenString(xs.reduce((s, x) => s + toUnits(x, dp), 0n), dp);
	};
	const detected = /* @__PURE__ */ new Set();
	for (const d of records) {
		const out = outgoing.get(d.txid);
		const fromWallet = out ? out.from : payers[d.txid]?.payer ?? null;
		const from = fromWallet ? receiving.has(fromWallet) ? "receiving-wallet" : "other-wallet" : "not-found";
		if (out?.to) detected.add(out.to);
		const units = toUnits(d.amount.replace(/^-/, ""), DECIMALS);
		const row = {
			id: recordKey(d),
			txid: d.txid,
			at: d.at,
			currency: d.currency,
			amount: d.amount,
			status: d.status,
			origin: from,
			fromWallet,
			matched: null,
			extra: null
		};
		const done = d.status === "done" || d.status === "completed" || d.status === "完成";
		const direction = d.amount.startsWith("-") ? "out" : "in";
		if (!done || direction === "out" || d.currency === "TWD") {
			rows.push(row);
			continue;
		}
		let extraKind = null;
		let extraAmount = d.amount;
		if (!STABLES.has(d.currency)) extraKind = "other-asset";
		else if (from !== "receiving-wallet") extraKind = from === "other-wallet" ? "other-wallet" : "not-found";
		else {
			let need = units;
			const used = [];
			let cost = 0n;
			let value = 0n;
			const rate = rates.get(d.at) ?? null;
			for (const lot of lots.get(d.currency) ?? []) {
				if (need === 0n) break;
				if (lot.left === 0n) continue;
				const take = lot.left < need ? lot.left : need;
				const part = (lot.costCents * take + lot.qty / 2n) / lot.qty;
				lot.left -= take;
				need -= take;
				cost += part;
				if (rate) value += centsOf(take, rate);
				used.push({
					receiptId: lot.receiptId,
					receivedAt: lot.receivedAt,
					sourceKey: lot.sourceKey,
					amount: tokenString(take, DECIMALS),
					costTwd: twd(part),
					rateAtReceipt: lot.rate
				});
			}
			const matchedUnits = units - need;
			if (matchedUnits > 0n) {
				costTotal += cost;
				matchedTotal += matchedUnits;
				if (!rate) valueComplete = false;
				else valueTotal += value;
				row.matched = {
					token: d.currency,
					amount: tokenString(matchedUnits, DECIMALS),
					lots: used,
					costTwd: twd(cost),
					rateAtDeposit: rate,
					valueTwd: rate ? twd(value) : null,
					fxDiffTwd: rate ? twd(value - cost) : null
				};
			}
			if (need > 0n) {
				extraKind = "beyond-income";
				extraAmount = tokenString(need, DECIMALS);
			}
		}
		if (extraKind) {
			row.extra = {
				kind: extraKind,
				currency: d.currency,
				amount: extraAmount
			};
			addExtra(d.currency, extraAmount);
		}
		rows.push(row);
	}
	const remaining = [...lots.entries()].map(([token, ls]) => ({
		token,
		amount: tokenString(ls.reduce((s, l) => s + l.left, 0n), DECIMALS)
	})).filter((r) => r.amount !== "0.00");
	return {
		checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
		files: store.files,
		rows: rows.reverse(),
		totals: {
			matchedToken: tokenString(matchedTotal, DECIMALS),
			costTwd: twd(costTotal),
			valueTwd: valueComplete ? twd(valueTotal) : null,
			fxDiffTwd: valueComplete ? twd(valueTotal - costTotal) : null,
			extras: [...extras.entries()].map(([currency, xs]) => ({
				currency,
				amount: sumDecimals(xs)
			}))
		},
		remainingIncome: remaining,
		detectedMaxAddresses: [...detected],
		maxAddressSet: config.maxDepositAddresses.some((a) => a.chain === "solana")
	};
}
//#endregion
//#region server/ledger.ts
var HOOK_PATH = "/api/hook/moonpay";
var USDC_DECIMALS = 6;
var PRICE_TOLERANCE_PCT = 3n;
async function loadPaylinkEntries(config, lang) {
	return Promise.all(config.paylinks.map(async (p) => {
		try {
			return {
				...p,
				preview: toPreview(p.id, await fetchPublicPaylink(p.id)),
				error: null
			};
		} catch (e) {
			return {
				...p,
				preview: null,
				error: errorText(lang, e, T("讀不到 MoonPay 上的付款連結", "Could not read this Pay Link from MoonPay"))
			};
		}
	}));
}
function walletsFrom(entries) {
	const byAddress = /* @__PURE__ */ new Map();
	for (const e of entries) for (const r of e.preview?.recipients ?? []) {
		const w = byAddress.get(r.address);
		if (w) {
			if (!w.paylinkIds.includes(e.id)) w.paylinkIds.push(e.id);
			continue;
		}
		const solanaUsdc = r.engine === "SOL" && (r.token === "USDC" || r.token === "USDT");
		byAddress.set(r.address, {
			chain: r.chain,
			engine: r.engine,
			address: r.address,
			paylinkIds: [e.id],
			readable: solanaUsdc,
			limit: solanaUsdc ? null : r.engine === "SOL" ? {
				kind: "token",
				token: r.token
			} : { kind: "webhook-only" }
		});
	}
	return [...byAddress.values()];
}
async function setupState(storage, config, lang) {
	const paylinks = await loadPaylinkEntries(config, lang);
	const secret = await loadWebhookSecret(storage);
	const events = await loadWebhookEvents(storage);
	return {
		checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
		paylinks,
		wallets: walletsFrom(paylinks),
		webhook: {
			configured: Boolean(secret?.sharedToken),
			tokenHint: secret?.sharedToken ? secret.sharedToken.slice(-4) : null,
			savedAt: secret?.savedAt ?? null,
			eventCount: events.length,
			lastEventAt: events.reduce((m, e) => !m || e.receivedAt > m ? e.receivedAt : m, null),
			hookPath: HOOK_PATH
		},
		maxDepositAddresses: config.maxDepositAddresses,
		maxImport: await maxImportStatus(storage)
	};
}
var CHAIN_NAME = {
	SOL: "Solana",
	BASE: "Base",
	ETH: "Ethereum",
	POLYGON: "Polygon",
	BTC: "Bitcoin"
};
var EXPLORER = {
	Solana: solscanTx,
	Base: (h) => `https://basescan.org/tx/${h}`
};
function attribute(t, event, candidates) {
	if (!t.viaMoonPay) return {
		key: "other",
		attribution: "not-moonpay"
	};
	if (event?.paylinkId) return {
		key: event.paylinkId,
		attribution: "webhook"
	};
	const paid = t.payerPaidUnits ?? t.amountUnits;
	const matches = candidates.filter((c) => {
		if (!c.preview) return false;
		const price = toUnits(c.preview.priceToken, USDC_DECIMALS);
		return (paid > price ? paid - price : price - paid) * 100n <= price * PRICE_TOLERANCE_PCT;
	});
	const only = matches[0];
	if (matches.length === 1 && only) return {
		key: only.id,
		attribution: candidates.length === 1 ? "only-paylink" : "price-match"
	};
	return {
		key: "unmatched",
		attribution: "unmatched"
	};
}
async function buildReceipts(storage, config, lang) {
	const entries = await loadPaylinkEntries(config, lang);
	const wallets = walletsFrom(entries);
	const events = await loadWebhookEvents(storage);
	const eventBySig = new Map(events.map((e) => [e.transactionSignature, e]));
	const maxAddresses = new Set(config.maxDepositAddresses.map((a) => a.address));
	const maxDeposits = await maxTxids(storage);
	const reads = [];
	const transfers = [];
	for (const w of wallets) {
		if (!w.readable) {
			reads.push({
				chain: w.chain,
				address: w.address,
				readable: false,
				error: null,
				limit: w.limit
			});
			continue;
		}
		try {
			transfers.push(...await readSolanaWallet(storage, w.address));
			reads.push({
				chain: w.chain,
				address: w.address,
				readable: true,
				error: null,
				limit: null
			});
		} catch (e) {
			reads.push({
				chain: w.chain,
				address: w.address,
				readable: true,
				error: errorText(lang, e, T("讀不到這個錢包", "Could not read this wallet")),
				limit: null
			});
		}
	}
	const drafts = [];
	const seen = /* @__PURE__ */ new Set();
	for (const t of transfers.filter((x) => x.direction === "in")) {
		seen.add(t.signature);
		const candidates = entries.filter((e) => wallets.find((w) => w.address === t.wallet)?.paylinkIds.includes(e.id));
		const { key, attribution } = attribute(t, eventBySig.get(t.signature), candidates);
		const gross = t.payerPaidUnits ?? t.amountUnits;
		drafts.push({
			id: t.signature,
			receivedAt: t.at,
			chain: "Solana",
			token: t.token,
			wallet: t.wallet,
			grossToken: t.payerPaidUnits !== null ? tokenString(t.payerPaidUnits, USDC_DECIMALS) : null,
			feeToken: t.feeUnits !== null ? tokenString(t.feeUnits, USDC_DECIMALS) : null,
			netToken: tokenString(t.amountUnits, USDC_DECIMALS),
			sourceKey: key,
			attribution,
			verifiedOnChain: true,
			explorerUrl: solscanTx(t.signature),
			grossUnits: gross,
			netUnits: t.amountUnits,
			feeUnits: t.feeUnits ?? 0n
		});
	}
	for (const e of events) {
		if (seen.has(e.transactionSignature) || !e.amountUnits || !["USDC", "USDT"].includes(e.tokenSymbol ?? "")) continue;
		const chain = CHAIN_NAME[e.chainSymbol ?? ""] ?? e.chainSymbol ?? "—";
		const units = BigInt(e.amountUnits);
		drafts.push({
			id: e.transactionSignature,
			receivedAt: e.createdAt ?? e.receivedAt,
			chain,
			token: e.tokenSymbol ?? "USDC",
			wallet: e.recipient ?? "",
			grossToken: tokenString(units, USDC_DECIMALS),
			feeToken: null,
			netToken: tokenString(units, USDC_DECIMALS),
			sourceKey: e.paylinkId ?? "unmatched",
			attribution: e.paylinkId ? "webhook" : "unmatched",
			verifiedOnChain: false,
			explorerUrl: EXPLORER[chain]?.(e.transactionSignature) ?? "",
			grossUnits: units,
			netUnits: units,
			feeUnits: 0n
		});
	}
	const rates = await ratesFor(storage, drafts.map((d) => d.receivedAt));
	const receipts = drafts.map(({ grossUnits, netUnits: _net, feeUnits: _fee, ...d }) => {
		const rate = rates.get(d.receivedAt) ?? null;
		return {
			...d,
			fxRateTwdPerUsd: rate,
			twdValue: rate ? twdValue(grossUnits, USDC_DECIMALS, rate) : null
		};
	}).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
	const units = new Map(drafts.map((d) => [d.id, d]));
	const summarize = (keep) => {
		const rows = receipts.filter(keep);
		let gross = 0n;
		let fee = 0n;
		let net = 0n;
		let twd = 0n;
		let twdComplete = true;
		for (const r of rows) {
			const u = units.get(r.id);
			gross += u?.grossUnits ?? 0n;
			fee += u?.feeUnits ?? 0n;
			net += u?.netUnits ?? 0n;
			if (r.twdValue === null) twdComplete = false;
			else twd += BigInt(r.twdValue);
		}
		return {
			count: rows.length,
			tokens: [...new Set(rows.map((r) => r.token))].sort(),
			grossTotalToken: tokenString(gross, USDC_DECIMALS),
			feeTotalToken: tokenString(fee, USDC_DECIMALS),
			netTotalToken: tokenString(net, USDC_DECIMALS),
			twdTotal: twdComplete ? twd.toString() : null
		};
	};
	const bySource = (key) => summarize((r) => r.sourceKey === key);
	const sources = entries.map((e) => ({
		key: e.id,
		kind: "paylink",
		label: e.label ?? e.preview?.name ?? null,
		paylinkName: e.preview?.name ?? null,
		siteUrl: e.siteUrl,
		registered: true,
		...bySource(e.id)
	}));
	const known = new Set(sources.map((s) => s.key));
	for (const key of new Set(receipts.map((r) => r.sourceKey))) {
		if (known.has(key) || key === "unmatched" || key === "other") continue;
		sources.push({
			key,
			kind: "paylink",
			label: null,
			paylinkName: null,
			siteUrl: null,
			registered: false,
			...bySource(key)
		});
	}
	const unmatched = bySource("unmatched");
	if (unmatched.count) sources.push({
		key: "unmatched",
		kind: "unmatched",
		label: null,
		paylinkName: null,
		siteUrl: null,
		registered: true,
		...unmatched
	});
	const other = bySource("other");
	if (other.count) sources.push({
		key: "other",
		kind: "other",
		label: null,
		paylinkName: null,
		siteUrl: null,
		registered: true,
		...other
	});
	const outgoing = transfers.filter((t) => t.direction === "out").map((t) => ({
		id: t.signature,
		sentAt: t.at,
		chain: "Solana",
		token: t.token,
		amountToken: tokenString(t.amountUnits, USDC_DECIMALS),
		from: t.wallet,
		to: t.counterparty,
		toMax: Boolean(t.counterparty && maxAddresses.has(t.counterparty) || maxDeposits.has(t.signature)),
		explorerUrl: solscanTx(t.signature)
	}));
	return {
		checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
		fxRateSource: FX_SOURCE,
		sources,
		totals: summarize((r) => r.sourceKey !== "other"),
		receipts,
		outgoing,
		wallets: reads,
		webhookConfigured: Boolean((await loadWebhookSecret(storage))?.sharedToken)
	};
}
//#endregion
//#region server/api.ts
async function identityOf(ctx) {
	if (!ctx.auth) return { method: "none" };
	const owner = await loadOwner(ctx.storage);
	return {
		method: "google",
		config: ctx.google ?? null,
		owner,
		binding: owner ? ownerBinding(owner) : null
	};
}
var NOT_CONFIGURED = T("這個 MoonMax Book 還沒接上 Google 登入，所以先關著。", "This MoonMax Book is not connected to Google sign-in yet, so it stays closed.");
function redirect(location, cookies) {
	const headers = new Headers({
		location,
		"cache-control": "no-store"
	});
	for (const c of cookies) headers.append("set-cookie", c);
	return new Response(null, {
		status: 302,
		headers
	});
}
var publicOrigin = (req) => {
	const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost";
	return `${req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
};
var HttpError = class extends Error {
	status;
	text;
	code;
	constructor(status, text, code) {
		super(typeof text === "string" ? text : text.en);
		this.status = status;
		this.text = text;
		this.code = code;
	}
};
var Reply = class {
	body;
	headers;
	constructor(body, headers) {
		this.body = body;
		this.headers = headers;
	}
};
var reply = (body, headers) => new Reply(body, headers);
function json(status, body, headers = {}) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"cache-control": "no-store",
			...headers
		}
	});
}
function assertSameOrigin(req) {
	const origin = req.headers.get("origin");
	const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
	let ok = false;
	try {
		ok = Boolean(origin && host && new URL(origin).host === host);
	} catch {
		ok = false;
	}
	if (!ok) throw new HttpError(403, T("只接受從 MoonMax Book 自己的頁面送出的修改。", "Changes are only accepted from MoonMax Book’s own pages."));
	if (req.method !== "DELETE" && !(req.headers.get("content-type") ?? "").includes("application/json")) throw new HttpError(415, T("需要 JSON。", "JSON required."));
}
async function readBody(req, limit = 1e4) {
	const text = await req.text();
	if (text.length > limit) throw new HttpError(413, T("內容太大。", "Request too large."));
	if (!text) return {};
	try {
		return JSON.parse(text);
	} catch {
		throw new HttpError(400, T("JSON 格式錯誤。", "Invalid JSON."));
	}
}
async function checkSite(input) {
	if (typeof input !== "string" || !input.trim()) return null;
	const url = normalizeUrl(input);
	if (!url) throw new HttpError(400, T("網站網址格式不對，請用 https:// 開頭的網址。", "That site address doesn’t look right — use one starting with https://."));
	try {
		const res = await fetchWithTimeout(url);
		if (!res.ok) throw new HttpError(422, T(`網站回應 HTTP ${res.status}，確認網址打得開。`, `The site responded with HTTP ${res.status}. Check that the address opens.`));
	} catch (e) {
		if (e instanceof HttpError) throw e;
		throw new HttpError(422, T("連不到這個網站，確認它已經上線。", "Could not reach this site. Check that it is live."));
	}
	return url;
}
function routes(ctx, id, lang) {
	const { storage } = ctx;
	const secure = ctx.runtime === "vercel";
	const state = async () => setupState(storage, await loadConfig(storage), lang);
	const signedIn = (req) => Boolean(ctx.auth && id.method === "google" && id.binding && verifySession(req.headers.get("cookie"), ctx.auth.sessionSecret, id.binding));
	return {
		"/api/auth/me": { GET: async (req) => {
			const authenticated = id.method === "none" || signedIn(req);
			return {
				method: id.method,
				configured: id.method === "none" || id.config !== null,
				authenticated,
				ownerEmail: authenticated && id.method === "google" ? id.owner?.email ?? null : null
			};
		} },
		"/api/auth/google/start": { GET: async (req) => {
			if (id.method !== "google") throw new HttpError(404, T("在你自己電腦上跑的版本不用登入。", "The copy running on your own computer has no sign-in."));
			if (!id.config) throw new HttpError(503, NOT_CONFIGURED);
			const { state: st, nonce } = newOauthState();
			return redirect(authorizeUrl(id.config, `${publicOrigin(req)}/api/auth/google/callback`, st, nonce), [oauthCookie(st, nonce, secure)]);
		} },
		"/api/auth/google/callback": { GET: async (req, q) => {
			if (id.method !== "google" || !ctx.auth) throw new HttpError(404, T("在你自己電腦上跑的版本不用登入。", "The copy running on your own computer has no sign-in."));
			const config = id.config;
			if (!config) throw new HttpError(503, NOT_CONFIGURED);
			const fail = (code) => redirect(`/?auth_error=${code}`, [clearedOauthCookie(secure)]);
			if (q.get("error")) return fail("denied");
			const saved = readOauthCookie(req.headers.get("cookie"));
			const code = q.get("code");
			if (!saved || !code || q.get("state") !== saved.state) return fail("state");
			let who;
			try {
				who = await exchangeCode(config, code, `${publicOrigin(req)}/api/auth/google/callback`, saved.nonce);
			} catch (e) {
				return fail(e instanceof GoogleLoginError ? e.code : "exchange");
			}
			let owner = id.owner;
			if (!owner) {
				owner = {
					sub: who.sub,
					email: who.email,
					claimedAt: (/* @__PURE__ */ new Date()).toISOString()
				};
				await saveOwner(storage, owner);
			}
			if (owner.sub !== who.sub) return fail("not_owner");
			return redirect("/#/", [clearedOauthCookie(secure), sessionCookie(ctx.auth.sessionSecret, ownerBinding(owner), secure)]);
		} },
		"/api/auth/logout": { POST: async () => reply({ ok: true }, { "set-cookie": clearedCookie(secure) }) },
		"/api/setup": { GET: state },
		"/api/setup/reset": { POST: async () => {
			await resetAll(storage);
			return reply(await state(), { "set-cookie": clearedCookie(secure) });
		} },
		"/api/setup/paylinks": {
			POST: async (req) => {
				const body = await readBody(req);
				const id = parsePaylinkId(String(body.input ?? ""));
				if (!id) throw new HttpError(400, T("看不到 Pay Link ID。它是 24 個英文字母和數字，通常在付款網址 moonpay.hel.io/pay/ 的後面。", "No Pay Link ID found. It is 24 letters and digits, usually after moonpay.hel.io/pay/ in the payment address."));
				const config = await loadConfig(storage);
				if (config.paylinks.some((p) => p.id === id)) throw new HttpError(409, T("這個 Pay Link 已經加過了。", "This Pay Link is already added."));
				try {
					await fetchPublicPaylink(id);
				} catch (e) {
					if (e instanceof PaylinkNotFound) throw new HttpError(404, T(`格式對了，但 MoonPay 找不到 ${id} 這個 Pay Link。確認你複製的是自己帳號裡的付款連結。`, `The format is right, but MoonPay can’t find Pay Link ${id}. Check that you copied a payment link from your own account.`));
					throw new HttpError(502, T(`讀不到 MoonPay（${e instanceof Error ? e.message : String(e)}）`, `Could not reach MoonPay (${e instanceof Error ? e.message : String(e)})`));
				}
				const siteUrl = await checkSite(body.siteUrl);
				config.paylinks.push({
					id,
					label: cleanLabel(body.label),
					siteUrl,
					addedAt: (/* @__PURE__ */ new Date()).toISOString()
				});
				await saveConfig(storage, config);
				return setupState(storage, config, lang);
			},
			PATCH: async (req) => {
				const body = await readBody(req);
				const config = await loadConfig(storage);
				const p = config.paylinks.find((x) => x.id === body.id);
				if (!p) throw new HttpError(404, T("找不到這個 Pay Link。", "Pay Link not found."));
				if ("label" in body) p.label = cleanLabel(body.label);
				if ("siteUrl" in body) p.siteUrl = await checkSite(body.siteUrl);
				await saveConfig(storage, config);
				return setupState(storage, config, lang);
			},
			DELETE: async (req, q) => {
				const id = String((await readBody(req)).id ?? q.get("id") ?? "");
				const config = await loadConfig(storage);
				config.paylinks = config.paylinks.filter((p) => p.id !== id);
				await saveConfig(storage, config);
				return setupState(storage, config, lang);
			}
		},
		"/api/setup/webhook": {
			POST: async (req) => {
				const token = String((await readBody(req)).sharedToken ?? "").trim();
				if (token.length < 16 || /\s/.test(token) || token.includes("*")) throw new HttpError(400, T("這不像完整的 Secret。到 MoonPay 的 Add Endpoint 表單，按 Secret 欄位右邊的複製鈕再貼一次（畫面上顯示的 ***** 是遮住的部分，要用複製鈕才拿得到完整的）。", "That doesn’t look like a complete Secret. In MoonPay’s Add Endpoint form, use the copy button next to the Secret field (the ***** part on screen is hidden — only the copy button gives you all of it)."));
				await saveWebhookSecret(storage, token);
				return state();
			},
			DELETE: async () => {
				await clearWebhookSecret(storage);
				return state();
			}
		},
		"/api/setup/max-address": {
			POST: async (req) => {
				const address = String((await readBody(req)).address ?? "").trim();
				if (!isSolanaAddress(address)) throw new HttpError(400, T("這不像 Solana 地址。Solana 地址是 32–44 個字元，不會有 0、O、I、l，也不會是 0x 開頭（0x 開頭的是 Ethereum／Base 地址）。", "That doesn’t look like a Solana address. Solana addresses are 32–44 characters, never contain 0, O, I or l, and never start with 0x (those are Ethereum/Base addresses)."));
				const config = await loadConfig(storage);
				config.maxDepositAddresses = [...config.maxDepositAddresses.filter((a) => a.chain !== "solana"), {
					chain: "solana",
					token: "USDC",
					address,
					addedAt: (/* @__PURE__ */ new Date()).toISOString()
				}];
				await saveConfig(storage, config);
				return setupState(storage, config, lang);
			},
			DELETE: async () => {
				const config = await loadConfig(storage);
				config.maxDepositAddresses = config.maxDepositAddresses.filter((a) => a.chain !== "solana");
				await saveConfig(storage, config);
				return setupState(storage, config, lang);
			}
		},
		"/api/real/receipts": { GET: async () => buildReceipts(storage, await loadConfig(storage), lang) },
		"/api/max/recon": { GET: async () => reconcile(storage, await loadConfig(storage), lang) },
		"/api/max/import": {
			POST: async (req) => {
				const body = await readBody(req, 2e6);
				const text = typeof body.text === "string" ? body.text : "";
				const fileName = (typeof body.fileName === "string" ? body.fileName : "max.csv").slice(0, 120);
				if (!text.trim()) throw new HttpError(400, T("這個檔案是空的。", "This file is empty."));
				try {
					return await importMaxCsv(storage, fileName, text);
				} catch (e) {
					if (e instanceof LocalizedError) throw new HttpError(422, e.text);
					throw e;
				}
			},
			DELETE: async () => {
				await clearMax(storage);
				return { ok: true };
			}
		},
		"/api/real/creator": { GET: async () => {
			const config = await loadConfig(storage);
			const first = config.paylinks[0];
			let company;
			if (first) try {
				company = (await fetchPublicPaylink(first.id)).company?.name;
			} catch {
				company = void 0;
			}
			return {
				id: "real",
				companyName: company ?? null,
				sourceCount: config.paylinks.length
			};
		} }
	};
}
async function handleHook(req, storage) {
	if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
	const secret = await loadWebhookSecret(storage);
	if (!secret?.sharedToken) throw new HttpError(503, "Webhook not configured");
	const raw = Buffer.from(await req.arrayBuffer());
	if (raw.length > 64e3) throw new HttpError(413, "Too large");
	if (!verifyWebhook(raw, req.headers.get("authorization"), req.headers.get("x-signature"), secret.sharedToken)) throw new HttpError(401, "Invalid signature");
	let body;
	try {
		body = JSON.parse(raw.toString("utf8"));
	} catch {
		throw new HttpError(400, "Invalid JSON");
	}
	const event = extractWebhookEvent(body);
	if (event) await saveWebhookEvent(storage, event);
	return {
		ok: true,
		stored: Boolean(event)
	};
}
var PUBLIC_PATHS = /* @__PURE__ */ new Set([
	"/api/auth/me",
	"/api/auth/google/start",
	"/api/auth/google/callback",
	HOOK_PATH
]);
async function handleApi(req, ctx) {
	const url = new URL(req.url);
	const rewritten = url.searchParams.get("path");
	const pathname = rewritten !== null && ctx.runtime === "vercel" ? `/api/${rewritten}`.replace(/\/+$/, "") : url.pathname.replace(/\/+$/, "");
	const method = req.method;
	const lang = langOf(req);
	try {
		if (pathname === "/api/hook/moonpay") return json(200, await handleHook(req, ctx.storage));
		if (ctx.runtime === "vercel" && !ctx.auth) throw new HttpError(503, T("這個部署少了 MOONMAX_SESSION_SECRET 環境變數，所以先全部關閉。", "This deployment is missing the MOONMAX_SESSION_SECRET environment variable, so everything is closed."));
		const id = await identityOf(ctx);
		if (ctx.auth && id.method === "google" && !PUBLIC_PATHS.has(pathname)) {
			if (!id.config) throw new HttpError(503, NOT_CONFIGURED, "auth");
			if (!id.binding || !verifySession(req.headers.get("cookie"), ctx.auth.sessionSecret, id.binding)) throw new HttpError(401, T("請先登入。", "Please sign in first."), "auth");
		}
		const handler = routes(ctx, id, lang)[pathname]?.[method];
		if (!handler) throw new HttpError(404, T(`沒有這個 API：${method} ${pathname}`, `No such API: ${method} ${pathname}`));
		if (method !== "GET") assertSameOrigin(req);
		const out = await handler(req, url.searchParams);
		if (out instanceof Response) return out;
		return out instanceof Reply ? json(200, out.body, out.headers) : json(200, out);
	} catch (e) {
		const status = e instanceof HttpError ? e.status : 500;
		const code = e instanceof HttpError ? e.code : void 0;
		return json(status, {
			error: e instanceof HttpError ? typeof e.text === "string" ? e.text : pick(lang, e.text) : e instanceof Error ? e.message : String(e),
			...code ? { code } : {}
		});
	}
}
//#endregion
//#region server/storage.ts
function assertKey(key) {
	if (!/^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/.test(key) || key.includes("..")) throw new Error(`bad storage key: ${key}`);
}
var BLOB_PREFIX = "moonmax/";
function blobStorage() {
	const pathOf = (key) => {
		assertKey(key);
		return `${BLOB_PREFIX}${key}.json`;
	};
	return {
		async get(key) {
			const res = await get(pathOf(key), {
				access: "private",
				useCache: false
			}).catch(() => null);
			if (!res || res.statusCode !== 200) return null;
			try {
				return JSON.parse(await new Response(res.stream).text());
			} catch {
				return null;
			}
		},
		async set(key, value) {
			await put(pathOf(key), JSON.stringify(value), {
				access: "private",
				allowOverwrite: true,
				addRandomSuffix: false,
				contentType: "application/json"
			});
		},
		async del(keys) {
			if (keys.length) await del(keys.map(pathOf));
		},
		async list(prefix) {
			const keys = [];
			let cursor;
			do {
				const page = await list({
					prefix: `${BLOB_PREFIX}${prefix}`,
					cursor,
					limit: 1e3
				});
				for (const b of page.blobs) keys.push(b.pathname.slice(8).replace(/\.json$/, ""));
				cursor = page.hasMore ? page.cursor : void 0;
			} while (cursor);
			return keys;
		}
	};
}
//#endregion
//#region server/vercel-entry.ts
function handle(request) {
	const sessionSecret = process.env.MOONMAX_SESSION_SECRET;
	const clientId = process.env.GOOGLE_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
	return handleApi(request, {
		storage: blobStorage(),
		runtime: "vercel",
		auth: sessionSecret ? { sessionSecret } : null,
		google: clientId && clientSecret ? {
			clientId,
			clientSecret
		} : null
	});
}
//#endregion
export { handle as DELETE, handle as GET, handle as PATCH, handle as POST };
