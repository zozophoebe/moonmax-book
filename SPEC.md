# TW Creator Pay — Technical Prototype Spec

> **Name note:** "TW Creator Pay" was the working name. The product shipped as **MoonMax Book**, a bookkeeping and reconciliation tool rather than a payment platform. See [README.md](README.md) for what it does today; §4 and §9 below are kept up to date.

> Status: draft, for prototype scoping. Items marked **[VERIFY]** are unconfirmed as of this writing and must be checked against live docs/APIs before being treated as fact — do not ship on an unverified assumption below.
>
> **Revision note:** §2–4 originally spec'd building the collection layer directly on `@solana/pay` (Solana-only). That was superseded once multi-chain support (Base, etc.) became a stated requirement — see the comparison made at that decision point: raw Solana Pay has no path to other chains, while MoonPay Commerce (Helio) already supports Solana, Base, Ethereum, and others behind one integration. §2–4 below are rewritten to reflect that. If you still see Solana-Pay-specific implementation detail anywhere below, it's a leftover that should be corrected the same way — flag it rather than trust it.

## 0. Non-negotiable architecture constraints

These three decisions were made deliberately earlier in scoping. Do not relax them without re-deriving the reasoning:

1. **Platform never custodies funds.** All payments settle wallet-to-wallet (payer → creator's own wallet). The backend only *observes* chain state; it never holds a private key or signs a transfer on a user's behalf.
2. **Platform never holds a user's exchange (MAX) credentials or API keys.** Off-ramp is a guided hand-off (deep link + prefilled deposit address), not a programmatic withdrawal executed by the platform. This keeps the product further from Taiwan's incoming VASP licensing scope (the Virtual Asset Service Act; its sub-regulations were not yet finalized as of this writing).
3. **Platform never holds a creator's MoonPay Commerce API secret** (added 2026-10-12, §4). Income is read from the public chain and labelled by MoonPay webhooks; the only MoonPay credential stored is a webhook `sharedToken`, which can verify notifications but cannot read or change the account.
4. **Two independent flows, not one unified "escrow" mechanic**:
   - **Flow A — Invoice/Payment Request** (known-client, freelance relationship): no locking, no escrow. Reusable payment link per creator, optionally per-project.
   - **Flow B — Paywall/Unlock** (anonymous buyer, digital goods or gated content): payment-gated content delivery. Separate module, separate trust model, build after A.

Do not build a "client approves Figma frame → payment auto-releases" mechanic. It was explored and rejected: the leak risk (screenshot/recreate) happens at the moment of *showing* the work, not at the moment of *paying*, so no payment mechanism fixes it. The real-world fix (deposit before production starts) requires no special tooling — just Flow A used earlier in the project timeline.

---

## 1. System overview

```
Creator's own site (vibe-coded, arbitrary stack)
        │
        │  <script> embed OR npx package
        ▼
┌─────────────────────────┐
│  Checkout Widget / QR    │  MoonPay Commerce (Helio) hosted/embedded
│  (client-side)            │  checkout — generates the payment request
└─────────────────────────┘
        │
        │  customer scans QR / clicks deep link → opens whichever wallet
        │  matches the chain they're paying from (handled by MoonPay
        │  Commerce's own widget — Solana, Base, Ethereum, etc.)
        ▼
┌─────────────────────────┐
│  Payer's wallet            │  Chosen and connected inside MoonPay
│  (chain depends on what    │  Commerce's widget, not built by us.
│   the payer holds)         │  (Phantom/Solflare/Backpack for Solana;
└─────────────────────────┘  standard EVM wallets for Base/Ethereum.)
        │
        │  payer completes payment inside the widget, on whichever
        │  chain/token MoonPay Commerce supports
        ▼
┌─────────────────────────┐
│  MoonPay Commerce            │  settles on-chain, on their
│  (external, not our infra)   │  infrastructure — we never touch
└─────────────────────────┘    the funds or the chain directly
        │
        │  MoonPay Commerce API/webhook reports "payment confirmed"
        ▼
┌─────────────────────────┐
│  Our backend                │  ingests the confirmed-payment event
│  → marks invoice "paid"     │  (see ledger/01-ingestion.md §1.1 — this
└─────────────────────────┘    is the same ingestion the bookkeeping
                                 layer already assumes)
        │
        ▼
┌─────────────────────────┐
│  Creator dashboard           │  shows balance, payment history
│  → "Cash out" CTA             │  → deep-links to MAX with prefilled,
│                                │     network-matched deposit address
└─────────────────────────┘
        │
        ▼
   MAX (external, out of our custody) → TWD → creator's own bank account
```

---

## 2. Payment request generation (Flow A & B share this primitive)

**Use MoonPay Commerce's (Helio's) API/widget to generate and host the payment request.** Do not hand-roll a Solana Pay URL/QR generator — that was the pre-multi-chain assumption. Reasoning from the decision point: Solana Pay is a Solana-only protocol with no extension path to other chains; MoonPay Commerce's own documentation confirms support for Solana, Bitcoin, Ethereum, Base, BNB Chain, Arbitrum, and Polygon "plus many others" behind one integration, including normalizing EVM-chain payments to USDC on Base for settlement. Building on their API means chain expansion later is a configuration change, not a rewrite.

**[VERIFY]** Read MoonPay Commerce's current developer docs (not marketing pages) for the actual shape of: creating a payment request/pay link with an amount and a correlating reference/label, and the webhook or API-polling mechanism for confirmation. The sub-sections below describe what to look for; fill in the exact field names once the live docs are in front of you.

### 2.1 What a payment request needs, regardless of their exact API shape
- The **creator's own payout destination** (never the platform's) — configured per-creator, once, during their MoonPay Commerce onboarding.
- A **correlating reference** — something that lets our backend unambiguously match a confirmed payment back to a specific invoice/product when a creator has multiple outstanding requests at once. MoonPay Commerce likely exposes something for this (an order ID, a label, a metadata field) — use whatever their API provides rather than inventing a parallel tracking scheme.
- A **human-readable label/message** shown to the payer before they approve (e.g. "Jane Design Studio — Invoice #004, Logo v2 final payment").

### 2.2 Reusable vs per-invoice links
- **Flow A, repeat/trusted client**: a static, reusable pay link with no fixed amount, if their API supports one — closer to "here's my payment address," matching the existing freelance habit of sharing a bank account number.
- **Flow A, specific invoice / Flow B, specific product**: a fresh, amount-fixed request per instance, so a confirmed payment can be matched unambiguously.

---

## 3. Wallet connection (payer side)

**Delegated entirely to MoonPay Commerce's widget — this is not something we build.** Their checkout already handles wallet connection appropriately per chain (Phantom/Solflare/Backpack-style flows for Solana, standard EVM wallet connection for Base/Ethereum/etc.). The only thing worth stating explicitly in our own product copy: never tell a payer to use a wallet incompatible with however they're actually paying (the classic failure mode here is suggesting an EVM-only wallet like MetaMask for what turns out to be a Solana payment, or vice versa) — but since the widget itself drives this interaction, this is mostly a documentation/support-content concern, not an implementation one.

For payers without any wallet yet (likely, given the target non-crypto-native audience on *both* sides of the transaction): check whether MoonPay Commerce's own widget already offers an onboarding/embedded-wallet path for first-time payers before building anything separate for this — it would be redundant to solve a problem their checkout may already handle.

---

## 4. Payment confirmation / indexing

> **Revised 2026-10-12.** The earlier version said "ingest MoonPay's confirmed-payment feed via API; no on-chain reading on our side." That needed each creator's MoonPay API Secret Key, which a multi-user product would have to store for everyone — a breach would expose every creator's MoonPay account, and the key can also create/modify Pay Links (it is not read-only). Replaced with a keyless design:

**C — the chain is the backbone.** Every Pay Link's public endpoint (`GET api.hel.io/v1/paylink/{id}/public`, no auth) lists its `recipients[]`: one receiving wallet per chain. MoonPay Commerce is non-custodial, so each payment lands directly in that wallet. We read the wallet's USDC history from a public RPC and take amount, time and fee split from the transaction itself. This is *observing a wallet the creator already told us about*, not settlement or indexing on anyone's behalf — §0.1 still holds.

**B — webhooks are the labels.** The chain shows *how much*, not *which Pay Link*: the on-chain memo carries MoonPay's transaction id, not the Pay Link id. A single Pay Link webhook scoped to all Pay Links (dashboard as of 2026-10: **Developer → Endpoints → Add Endpoint**, Webhook = Pay Link, Pay Link = All Pay Links; the docs call this Developers → Webhooks / Global) sends `paylinkId` + `transactionSignature` for each payment. We join on the signature. Without a webhook, attribution falls back to: the only registered Pay Link paying into that wallet → amount ≈ one Pay Link's price (±3%) → "unmatched". Fallbacks are labelled as guesses in the UI.

**Multiple sites = multiple Pay Links.** One Pay Link per site/product is the unit of separation. Several Pay Links may share a wallet; only B can then tell them apart.

Verified 2026-10-12 against docs.hel.io and live data:
- Public Pay Link response exposes `recipients[].wallet.publicKey` per chain (Solana + Base on the creator's link).
- A real 2.00 USDC test payment: buyer −1.997724, creator +1.957770, two fee accounts +0.035958 / +0.003996 (= 2.0%). Program `ENicYBBNZQ91toN7ggmTxnDGZW14uv9UkumN7XBGeYJ4`, instruction `SinglePayment`; memo = MoonPay transaction id + hash.
- Webhook auth: `Authorization: Bearer <sharedToken>` **and** `X-Signature` = HMAC-SHA256(raw body, sharedToken). The dashboard pre-generates this token as the endpoint's **Secret** inside the Add Endpoint form (copy button; display is masked). There is no event picker in the dashboard form. Up to 12 automatic retries; manual replay in the dashboard.
- Webhook payload includes buyer PII (`customerDetails`: email, name, address, phone). We discard it on receipt and store only signature, Pay Link id, amount, fee, recipient, timestamps.
- Dashboard exports transactions as CSV (backfill path for payments before the webhook existed).
- Base: the public RPC (`mainnet.base.org`) rejects `eth_getLogs`, and Blockscout sits behind a bot check. Base receipts come from webhooks only until we add a provider.

Prototype implementation: `dashboard/server/{chain,moonpay,ledger,fx}.ts`; endpoint `/api/real/receipts`; webhook receiver `/api/hook/moonpay`.

**Deployed (2026-10-13):** https://moonmax-book.vercel.app — single-owner. One Request→Response handler (`server/api.ts`) serves both the local Vite dev server (file storage, no login, localhost only) and a Vercel Function (`server/vercel-entry.ts`, bundled to `api/index.js` by `vite.api.config.ts` because TypeScript 7 no longer ships the JS API Vercel's TS compile uses). `vercel.json` rewrites `/api/*` → `/api?path=*`. Storage = a **private** Vercel Blob store (`moonmax-book-data`; one blob per webhook event so concurrent deliveries can't clobber each other). Login (2026-10-13): **Sign in with Google only.** With `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` the site requires Google from the first visit (OIDC code flow, state + nonce, ID-token claims checked from the token endpoint); the first Google account to sign in becomes the owner (`moonmax/owner.local.json`), others get `not_owner`, and the Google app stays in Testing with only the owner as test user. Without the Google env vars the deployed site is **closed** (only a "login not set up" page; webhook still served). Sessions: HMAC-signed HttpOnly SameSite=Strict cookie keyed by `MOONMAX_SESSION_SECRET`, bound to the owner record. Lost access / wrong owner: `npx vercel blob del moonmax/owner.local.json`. (An in-app password mode existed briefly and was removed at the owner's request.) Writes require Origin = Host. The demo was removed from this app; a full copy with the demo lives in `dashboard-with-demo-2026-10-13/`.

---

## 5. MAX off-ramp integration

### 5.1 What's confirmed
- MAX supports Solana network SPL-USDC deposit and withdrawal (confirmed, live since 2022).
- Individual (natural person) account: Level 1 (ID/ARC/passport) + Level 2 (linked Taiwan bank account, **must be in the account holder's own name** — standard AML control, cannot be a third party's account) KYC, no company/business registration required for an individual user.
- Individual TWD withdrawal: single-transaction cap NT$1,000,000, plus a rolling 24-hour aggregate cap **[verify current exact 24h cap figure at build time — these limits are adjusted by the exchange periodically]**.

### 5.2 What's NOT confirmed — verify before designing the "Cash out" UI around it
- **[VERIFY]** Whether MAX exposes any public partner/developer API that would allow a third-party dashboard to (a) check a user's MAX deposit address programmatically, or (b) trigger a sell/withdraw action on the user's behalf with their consent (e.g. an OAuth-style account link). If this does not exist, the "Cash out" button in the creator dashboard must be implemented as:
  1. Display the creator's correct, network-matched MAX deposit address (the creator provides this once during their own MAX onboarding, pasted into their TW Creator Pay profile — the platform does not fetch it via API).
  2. A deep link / clear instructions guiding the creator to MAX's own withdrawal UI to complete the sell + TWD withdrawal themselves.
- Do not build toward "one-click automated cash-out" as a v1 deliverable unless a partner API is confirmed to exist — that assumption currently has no evidentiary basis.

### 5.3 The actual hard product problem here
Not the integration — the **network-matching safety UI**. A wrong-network transfer (e.g. sending Base-network USDC to a Solana-network deposit address, or vice versa) is unrecoverable fund loss. Now that collection goes through MoonPay Commerce and can span multiple chains (§2), this matters *more*, not less — a creator collecting on both Solana and Base needs to cash out through the matching MAX deposit address for whichever chain that specific balance is on, never a mix-up between them. The dashboard must:
- Know which network a given balance actually sits on (now variable, not fixed — read this from MoonPay Commerce's settlement records per `ledger/01-ingestion.md`, don't assume).
- Only ever surface the MAX deposit address for the matching network, labeled unambiguously per chain (e.g. "Solana network only" vs. "Base network only — do not mix these up").
- Ideally, pre-fill/QR-encode the withdrawal destination rather than requiring manual copy-paste of a long address string (classic error source).

---

## 6. Data model (sketch)

```
creators
  id, display_name, moonpay_commerce_account_ref,
  max_deposit_addresses (map of chain → address, self-reported, one per supported chain),
  locale, created_at

payment_requests        -- Flow A
  id, creator_id, moonpay_commerce_request_id, chain, amount_usdc, label, message,
  status (pending | confirmed | expired), client_note,
  confirmed_at, created_at

unlockable_items         -- Flow B, build after A
  id, creator_id, title, price_usdc, delivery_type (file_link | notion_link | course_access),
  content_ref (opaque pointer, never the raw asset itself), created_at

unlock_purchases         -- Flow B
  id, item_id, moonpay_commerce_request_id, buyer_ref (optional, may be unknown until confirmed),
  status, confirmed_at
```

Note `chain` and `max_deposit_addresses` are no longer fixed-Solana fields — see §5.3 and §7.

Keep Flow A and Flow B as separate tables/modules from day one — they have different trust models (§0.4) and will likely diverge further (e.g. Flow B needs delivery/access-control logic that Flow A never will).

---

## 7. Explicit non-goals for the prototype

- No custodial wallet for creators or payers.
- No automated MAX withdrawal execution (pending §5.2 verification).
- No "escrow release on approval" mechanic (§0, rejected).
- No building our own on-chain settlement. Reading the creator's own receiving wallets is in scope (§4); general-purpose indexing is not.
- No adult-content-specific trust & safety infrastructure (age verification, content moderation) — if that vertical is pursued, it is a separate product surface per the earlier branding/compliance-contagion discussion, not a flag on this schema.

---

## 8. Before writing code, verify

1. Read MoonPay Commerce's actual current API/webhook reference (not just marketing pages) for the exact payment-request and confirmation field shapes (§2, §4) — this spec describes the architecture, not their literal API signatures.
2. Confirm MAX partner/developer API existence (§5.2), including whether a read-only personal-history API exists even without a write/partner tier — this determines how much of the "Cash out" flow is buildable as true product UX vs. instructional hand-off.
3. Confirm MoonPay Commerce's current list of supported chains/tokens directly against their live docs — stated in §2 from research done at a point in time and may have changed or expanded.
4. Confirm MAX's current withdrawal limits and per-chain deposit-address support directly against their live docs at build time.
5. **[VERIFY]** Webhook `meta.amount` vs `meta.totalAmount` vs `fee` semantics with a real webhook delivery (the docs sample is SOL-denominated and ambiguous). Webhook-only receipts currently treat `totalAmount` as gross.

---

## 9. Open decisions (2026-10-12)

1. **TWD rate source.** Interim: currency-api daily USD/TWD (free, no key). The Central Bank's open API file `BP01D01en` stops in 2012; Bank of Taiwan's historical CSV is behind a bot check. Needs an accountant to name the acceptable official source.
2. **Gross vs net income.** Valuation uses gross (what the buyer paid, `ledger/02`), with MoonPay's fee shown separately. Confirm with an accountant that fee-as-expense is the intended treatment.
3. **Base reading.** Webhook-only for now. A keyed provider (Alchemy, Etherscan v2) would make Base readable but reintroduces a key — ours, not the creator's.
4. **Backfill before the webhook.** Import MoonPay's dashboard CSV (format unknown until a real export is seen).
