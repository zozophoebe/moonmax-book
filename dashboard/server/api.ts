// The whole API as one Request → Response function, shared by the local Vite dev server
// (server/platformApi.ts) and the Vercel Function (server/vercel-entry.ts → api/index.js).
// No MoonPay API keys anywhere: payments are read from the public chain and labelled by webhooks.

import type { Creator } from '../src/types/ledger'
import { accountByUid, accountForLogin, deleteAccount, hookPathFor, sessionBinding, workspacePrefix, type Account } from './accounts'
import { clearedCookie, readSession, sessionCookie, verifySession } from './auth'
import { authorizeUrl, clearedOauthCookie, exchangeCode, GoogleLoginError, newOauthState, oauthCookie, readOauthCookie, type GoogleConfig } from './google'
import { cleanLabel, isSolanaAddress, loadConfig, normalizeUrl, parsePaylinkId, saveConfig } from './config'
import { fetchWithTimeout } from './http'
import { langOf, pick, T, type Lang, type Text } from './i18n'
import { buildReceipts, HOOK_PATH, setupState } from './ledger'
import { extractWebhookEvent, fetchPublicPaylink, PaylinkNotFound, verifyWebhook } from './moonpay'
import { loadSample, sampleSources } from './sample'
import { liveSources, type Sources } from './sources'
import { clearMax, importMaxCsv, maxTxids, reconcile } from './max'
import { LocalizedError } from './i18n'
import { scopedStorage, type Storage } from './storage'
import { clearWebhookSecret, clearWorkspace, isSampleWorkspace, loadWebhookEvents, loadWebhookSecret, saveWebhookEvent, saveWebhookSecret } from './store'

export type ApiContext = {
  storage: Storage // the whole store; each account's ledger is a scoped part of it
  runtime: 'local' | 'vercel'
  // Deployed: the cookie-signing key (MOONMAX_SESSION_SECRET). Local dev: null — no login,
  // only localhost can reach it.
  auth: { sessionSecret: string } | null
  // Deployed: Google sign-in is the only way in. Missing GOOGLE_CLIENT_ID/SECRET = site stays closed.
  google?: GoogleConfig | null
}

// Who is asking. Local dev has no sign-in; deployed, anyone can sign in with Google and gets
// their own ledger (server/accounts.ts).
type Identity = { method: 'none' } | { method: 'google'; config: GoogleConfig | null; account: Account | null }

async function identityOf(req: Request, ctx: ApiContext): Promise<Identity> {
  if (!ctx.auth) return { method: 'none' }
  const session = readSession(req.headers.get('cookie'))
  const account = session ? await accountByUid(ctx.storage, session.uid) : null
  const valid = Boolean(session && account && verifySession(session, ctx.auth.sessionSecret, sessionBinding(account)))
  return { method: 'google', config: ctx.google ?? null, account: valid ? account : null }
}

// The ledger a request works on: its storage, its webhook URL, and where outside data comes from.
type Workspace = { storage: Storage; hookPath: string; src: Sources }

async function workspaceOf(ctx: ApiContext, account: Account | null): Promise<Workspace> {
  const storage = account ? scopedStorage(ctx.storage, workspacePrefix(account.uid)) : ctx.storage
  return { storage, hookPath: account ? hookPathFor(account.uid) : HOOK_PATH, src: (await isSampleWorkspace(storage)) ? sampleSources : liveSources }
}

const NOT_CONFIGURED = T('這個 MoonMax Book 還沒接上 Google 登入，所以先關著。', 'This MoonMax Book is not connected to Google sign-in yet, so it stays closed.')

function redirect(location: string, cookies: string[]): Response {
  const headers = new Headers({ location, 'cache-control': 'no-store' })
  for (const c of cookies) headers.append('set-cookie', c)
  return new Response(null, { status: 302, headers })
}

const publicOrigin = (req: Request) => {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost'
  const proto = req.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly text: Text | string, // plain strings only for machine-to-machine replies (webhook)
    readonly code?: string,
  ) {
    super(typeof text === 'string' ? text : text.en)
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'
type Handler = (req: Request, q: URLSearchParams) => Promise<unknown>
// A handler result that also sets response headers (cookies).
class Reply {
  constructor(
    readonly body: unknown,
    readonly headers: Record<string, string>,
  ) {}
}
const reply = (body: unknown, headers: Record<string, string>) => new Reply(body, headers)

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } })
}

// Writes must come from this app's own pages: an Origin header that matches the host,
// plus a JSON body (which forces a CORS preflight for cross-site callers).
function assertSameOrigin(req: Request) {
  const origin = req.headers.get('origin')
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  let ok = false
  try {
    ok = Boolean(origin && host && new URL(origin).host === host)
  } catch {
    ok = false
  }
  if (!ok) throw new HttpError(403, T('只接受從 MoonMax Book 自己的頁面送出的修改。', 'Changes are only accepted from MoonMax Book’s own pages.'))
  if (req.method !== 'DELETE' && !(req.headers.get('content-type') ?? '').includes('application/json')) throw new HttpError(415, T('需要 JSON。', 'JSON required.'))
}

async function readBody(req: Request, limit = 10_000): Promise<Record<string, unknown>> {
  const text = await req.text()
  if (text.length > limit) throw new HttpError(413, T('內容太大。', 'Request too large.'))
  if (!text) return {}
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new HttpError(400, T('JSON 格式錯誤。', 'Invalid JSON.'))
  }
}

async function checkSite(input: unknown): Promise<string | null> {
  if (typeof input !== 'string' || !input.trim()) return null
  const url = normalizeUrl(input)
  if (!url) throw new HttpError(400, T('網站網址格式不對，請用 https:// 開頭的網址。', 'That site address doesn’t look right — use one starting with https://.'))
  try {
    const res = await fetchWithTimeout(url)
    if (!res.ok) throw new HttpError(422, T(`網站回應 HTTP ${res.status}，確認網址打得開。`, `The site responded with HTTP ${res.status}. Check that the address opens.`))
  } catch (e) {
    if (e instanceof HttpError) throw e
    throw new HttpError(422, T('連不到這個網站，確認它已經上線。', 'Could not reach this site. Check that it is live.'))
  }
  return url
}

type Routes = Record<string, Partial<Record<Method, Handler>>>

// Reachable without signing in.
function publicRoutes(ctx: ApiContext, id: Identity): Routes {
  const secure = ctx.runtime === 'vercel'
  return {
    '/api/auth/me': {
      GET: async () => {
        const authenticated = id.method === 'none' || id.account !== null
        return {
          method: id.method,
          configured: id.method === 'none' || id.config !== null,
          authenticated,
          email: id.method === 'google' ? (id.account?.email ?? null) : null,
        }
      },
    },

    '/api/auth/google/start': {
      GET: async (req) => {
        if (id.method !== 'google') throw new HttpError(404, T('在你自己電腦上跑的版本不用登入。', 'The copy running on your own computer has no sign-in.'))
        if (!id.config) throw new HttpError(503, NOT_CONFIGURED)
        const { state: st, nonce } = newOauthState()
        const url = authorizeUrl(id.config, `${publicOrigin(req)}/api/auth/google/callback`, st, nonce)
        return redirect(url, [oauthCookie(st, nonce, secure)])
      },
    },
    '/api/auth/google/callback': {
      GET: async (req, q) => {
        if (id.method !== 'google' || !ctx.auth) throw new HttpError(404, T('在你自己電腦上跑的版本不用登入。', 'The copy running on your own computer has no sign-in.'))
        const config = id.config
        if (!config) throw new HttpError(503, NOT_CONFIGURED)
        const fail = (code: string) => redirect(`/?auth_error=${code}`, [clearedOauthCookie(secure)])
        if (q.get('error')) return fail('denied')
        const saved = readOauthCookie(req.headers.get('cookie'))
        const code = q.get('code')
        if (!saved || !code || q.get('state') !== saved.state) return fail('state')
        let who: { sub: string; email: string }
        try {
          who = await exchangeCode(config, code, `${publicOrigin(req)}/api/auth/google/callback`, saved.nonce)
        } catch (e) {
          return fail(e instanceof GoogleLoginError ? e.code : 'exchange')
        }
        // Every Google account gets its own ledger; the first sign-in creates it.
        const account = await accountForLogin(ctx.storage, who)
        return redirect('/#/', [clearedOauthCookie(secure), sessionCookie(ctx.auth.sessionSecret, account.uid, sessionBinding(account), secure)])
      },
    },
  }
}

const SAMPLE_READ_ONLY = T(
  '這是範例資料，不能修改。先在「開始使用」最上面按「清除範例資料」，再加入你自己的。',
  'This is sample data and can’t be changed. Clear it with “Clear sample data” at the top of Get started, then add your own.',
)

// The signed-in account's own ledger (or, locally, the one ledger, with account = null).
function ledgerRoutes(ctx: ApiContext, ws: Workspace, lang: Lang, account: Account | null): Routes {
  const { storage, src } = ws
  const secure = ctx.runtime === 'vercel'
  const stateWith = async (sources: Sources) => setupState(storage, await loadConfig(storage), lang, sources, ws.hookPath)
  const state = () => stateWith(src)
  // The sample ledger is read-only: clear it before adding real settings.
  const writable = () => {
    if (src.sample) throw new HttpError(409, SAMPLE_READ_ONLY)
  }

  return {
    '/api/auth/logout': { POST: async () => reply({ ok: true }, { 'set-cookie': clearedCookie(secure) }) },
    '/api/setup': { GET: state },

    // Deployed: "Delete account and all data" — the ledger, then the account itself.
    // Local: "Clear everything and start over".
    '/api/setup/reset': {
      POST: async () => {
        await clearWorkspace(storage)
        if (account) await deleteAccount(ctx.storage, account)
        return reply(await stateWith(liveSources), { 'set-cookie': clearedCookie(secure) })
      },
    },

    // A made-up ledger for people without MoonPay or MAX accounts (server/sample.ts).
    '/api/sample': {
      POST: async () => {
        if (src.sample) return state()
        const config = await loadConfig(storage)
        const empty = !config.paylinks.length && !config.maxDepositAddresses.length && !(await loadWebhookSecret(storage)) && !(await loadWebhookEvents(storage)).length && !(await maxTxids(storage)).size
        if (!empty) throw new HttpError(409, T('範例資料只能放進空的帳本，這本已經有你自己的設定了。', 'Sample data can only go into an empty ledger, and this one already has your settings.'))
        await loadSample(storage, lang)
        return stateWith(sampleSources)
      },
      DELETE: async () => {
        if (!src.sample) throw new HttpError(409, T('這本帳不是範例資料，沒有東西要清除。', 'This ledger isn’t sample data, so there’s nothing to clear.'))
        await clearWorkspace(storage)
        return stateWith(liveSources)
      },
    },

    '/api/setup/paylinks': {
      POST: async (req) => {
        writable()
        const body = await readBody(req)
        const id = parsePaylinkId(String(body.input ?? ''))
        if (!id) throw new HttpError(400, T('看不到 Pay Link ID。它是 24 個英文字母和數字，通常在付款網址 moonpay.hel.io/pay/ 的後面。', 'No Pay Link ID found. It is 24 letters and digits, usually after moonpay.hel.io/pay/ in the payment address.'))
        const config = await loadConfig(storage)
        if (config.paylinks.some((p) => p.id === id)) throw new HttpError(409, T('這個 Pay Link 已經加過了。', 'This Pay Link is already added.'))
        try {
          await fetchPublicPaylink(id)
        } catch (e) {
          if (e instanceof PaylinkNotFound) throw new HttpError(404, T(`格式對了，但 MoonPay 找不到 ${id} 這個 Pay Link。確認你複製的是自己帳號裡的付款連結。`, `The format is right, but MoonPay can’t find Pay Link ${id}. Check that you copied a payment link from your own account.`))
          throw new HttpError(502, T(`讀不到 MoonPay（${e instanceof Error ? e.message : String(e)}）`, `Could not reach MoonPay (${e instanceof Error ? e.message : String(e)})`))
        }
        const siteUrl = await checkSite(body.siteUrl)
        config.paylinks.push({ id, label: cleanLabel(body.label), siteUrl, addedAt: new Date().toISOString() })
        await saveConfig(storage, config)
        return state()
      },
      PATCH: async (req) => {
        writable()
        const body = await readBody(req)
        const config = await loadConfig(storage)
        const p = config.paylinks.find((x) => x.id === body.id)
        if (!p) throw new HttpError(404, T('找不到這個 Pay Link。', 'Pay Link not found.'))
        if ('label' in body) p.label = cleanLabel(body.label)
        if ('siteUrl' in body) p.siteUrl = await checkSite(body.siteUrl)
        await saveConfig(storage, config)
        return state()
      },
      DELETE: async (req, q) => {
        writable()
        const id = String((await readBody(req)).id ?? q.get('id') ?? '')
        const config = await loadConfig(storage)
        config.paylinks = config.paylinks.filter((p) => p.id !== id)
        await saveConfig(storage, config)
        return state()
      },
    },

    '/api/setup/webhook': {
      POST: async (req) => {
        writable()
        const token = String((await readBody(req)).sharedToken ?? '').trim()
        if (token.length < 16 || /\s/.test(token) || token.includes('*')) {
          throw new HttpError(400, T('這不像完整的 Secret。到 MoonPay 的 Add Endpoint 表單，按 Secret 欄位右邊的複製鈕再貼一次（畫面上顯示的 ***** 是遮住的部分，要用複製鈕才拿得到完整的）。', 'That doesn’t look like a complete Secret. In MoonPay’s Add Endpoint form, use the copy button next to the Secret field (the ***** part on screen is hidden — only the copy button gives you all of it).'))
        }
        await saveWebhookSecret(storage, token)
        return state()
      },
      DELETE: async () => {
        writable()
        await clearWebhookSecret(storage)
        return state()
      },
    },

    '/api/setup/max-address': {
      POST: async (req) => {
        writable()
        const address = String((await readBody(req)).address ?? '').trim()
        if (!isSolanaAddress(address)) {
          throw new HttpError(400, T('這不像 Solana 地址。Solana 地址是 32–44 個字元，不會有 0、O、I、l，也不會是 0x 開頭（0x 開頭的是 Ethereum／Base 地址）。', 'That doesn’t look like a Solana address. Solana addresses are 32–44 characters, never contain 0, O, I or l, and never start with 0x (those are Ethereum/Base addresses).'))
        }
        const config = await loadConfig(storage)
        config.maxDepositAddresses = [
          ...config.maxDepositAddresses.filter((a) => a.chain !== 'solana'),
          { chain: 'solana', token: 'USDC', address, addedAt: new Date().toISOString() },
        ]
        await saveConfig(storage, config)
        return state()
      },
      DELETE: async () => {
        writable()
        const config = await loadConfig(storage)
        config.maxDepositAddresses = config.maxDepositAddresses.filter((a) => a.chain !== 'solana')
        await saveConfig(storage, config)
        return state()
      },
    },

    '/api/real/receipts': { GET: async () => buildReceipts(storage, await loadConfig(storage), lang, src) },

    '/api/max/recon': { GET: async () => reconcile(storage, await loadConfig(storage), lang, src) },
    '/api/max/import': {
      POST: async (req) => {
        writable()
        const body = await readBody(req, 2_000_000)
        const text = typeof body.text === 'string' ? body.text : ''
        const fileName = (typeof body.fileName === 'string' ? body.fileName : 'max.csv').slice(0, 120)
        if (!text.trim()) throw new HttpError(400, T('這個檔案是空的。', 'This file is empty.'))
        try {
          return await importMaxCsv(storage, fileName, text)
        } catch (e) {
          if (e instanceof LocalizedError) throw new HttpError(422, e.text)
          throw e
        }
      },
      DELETE: async () => {
        writable()
        await clearMax(storage)
        return { ok: true }
      },
    },

    '/api/real/creator': {
      GET: async (): Promise<Creator> => {
        const config = await loadConfig(storage)
        const first = config.paylinks[0]
        let company: string | null = null
        if (first) {
          try {
            company = await src.companyName(first.id)
          } catch {
            company = null
          }
        }
        return { id: 'real', companyName: company, sourceCount: config.paylinks.length }
      },
    },
  }
}

// MoonPay → us. Authenticated by the endpoint's Secret (the docs call it sharedToken), not by login.
async function handleHook(req: Request, storage: Storage): Promise<unknown> {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
  const secret = await loadWebhookSecret(storage)
  if (!secret?.sharedToken) throw new HttpError(503, 'Webhook not configured')
  const raw = Buffer.from(await req.arrayBuffer())
  if (raw.length > 64_000) throw new HttpError(413, 'Too large')
  if (!verifyWebhook(raw, req.headers.get('authorization'), req.headers.get('x-signature'), secret.sharedToken)) throw new HttpError(401, 'Invalid signature')
  let body: unknown
  try {
    body = JSON.parse(raw.toString('utf8'))
  } catch {
    throw new HttpError(400, 'Invalid JSON')
  }
  const event = extractWebhookEvent(body as Parameters<typeof extractWebhookEvent>[0])
  if (event) await saveWebhookEvent(storage, event)
  return { ok: true, stored: Boolean(event) }
}

const PUBLIC_PATHS = new Set(['/api/auth/me', '/api/auth/google/start', '/api/auth/google/callback'])

// MoonPay posts to /api/hook/moonpay/<uid> (one URL per ledger), or /api/hook/moonpay for the
// root ledger (local dev, and the owner of the earlier single-owner version).
async function hookStorage(ctx: ApiContext, pathname: string): Promise<Storage> {
  const uid = pathname.slice(HOOK_PATH.length + 1)
  if (!uid) return ctx.storage
  const account = ctx.auth ? await accountByUid(ctx.storage, uid) : null
  if (!account) throw new HttpError(404, 'Unknown webhook endpoint')
  return scopedStorage(ctx.storage, workspacePrefix(account.uid))
}

export async function handleApi(req: Request, ctx: ApiContext): Promise<Response> {
  const url = new URL(req.url)
  // On Vercel every /api/* path is rewritten to the single function as /api?path=…
  const rewritten = url.searchParams.get('path')
  const pathname = rewritten !== null && ctx.runtime === 'vercel' ? `/api/${rewritten}`.replace(/\/+$/, '') : url.pathname.replace(/\/+$/, '')
  const method = req.method as Method
  const lang = langOf(req)

  try {
    if (pathname === HOOK_PATH || pathname.startsWith(`${HOOK_PATH}/`)) return json(200, await handleHook(req, await hookStorage(ctx, pathname)))

    if (ctx.runtime === 'vercel' && !ctx.auth) {
      throw new HttpError(503, T('這個部署少了 MOONMAX_SESSION_SECRET 環境變數，所以先全部關閉。', 'This deployment is missing the MOONMAX_SESSION_SECRET environment variable, so everything is closed.'))
    }
    const id = await identityOf(req, ctx)
    let table: Routes
    if (PUBLIC_PATHS.has(pathname)) {
      table = publicRoutes(ctx, id)
    } else {
      // Deployed: everything else needs a Google session. No Google keys = closed.
      if (id.method === 'google' && !id.config) throw new HttpError(503, NOT_CONFIGURED, 'auth')
      if (id.method === 'google' && !id.account) throw new HttpError(401, T('請先登入。', 'Please sign in first.'), 'auth')
      const account = id.method === 'google' ? id.account : null
      table = ledgerRoutes(ctx, await workspaceOf(ctx, account), lang, account)
    }

    const handler = table[pathname]?.[method]
    if (!handler) throw new HttpError(404, T(`沒有這個 API：${method} ${pathname}`, `No such API: ${method} ${pathname}`))
    if (method !== 'GET') assertSameOrigin(req)
    const out = await handler(req, url.searchParams)
    if (out instanceof Response) return out
    return out instanceof Reply ? json(200, out.body, out.headers) : json(200, out)
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500
    const code = e instanceof HttpError ? e.code : undefined
    const message = e instanceof HttpError ? (typeof e.text === 'string' ? e.text : pick(lang, e.text)) : e instanceof Error ? e.message : String(e)
    return json(status, { error: message, ...(code ? { code } : {}) })
  }
}
