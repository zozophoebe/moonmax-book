# MoonMax Book

Bookkeeping for Taiwanese creators who get paid in crypto.

A buyer pays in USDC through MoonPay Commerce, and the money goes straight into the creator's own wallet. The creator later moves it to the MAX exchange and sells it for Taiwan dollars. MoonMax Book follows that path. It values every payment in TWD on the day it arrived and lists sales separately for each website. It also matches the creator's MAX deposits back to that income, so they have clean records to hand to an accountant at tax time.

**Live:** https://moonmax-book.vercel.app (only the owner's Google account can sign in)

## How it works

```
Buyer ──USDC──▶ creator's wallet (Solana) ──USDC──▶ MAX ──sell──▶ TWD in the bank
                  │                                   │
                  │ read from the public chain        │ funds-history CSV
                  ▼                                   ▼
             MoonMax Book: each receipt in TWD  ◀── matched first-in, first-out
                  ▲
                  │ MoonPay webhook: which Pay Link (website) the payment came from
```

- **No API keys.** Payments are read from the public blockchain, using the receiving wallets listed on each public Pay Link. MoonPay's webhook only says which Pay Link a payment belongs to. Nobody's MoonPay secret key or MAX login is ever stored.
- **TWD at receipt.** Each payment is valued as the amount the buyer paid × that day's USD/TWD rate, with MoonPay's fee shown separately.
- **Cash-out reconciliation.** Upload MAX's funds-history CSV. Each deposit is looked up on chain by its transaction ID. USDC sent from a receiving wallet is matched oldest-first against MoonPay income, which gives its TWD value when received, its value on the deposit day, and the exchange-rate difference. Anything else is flagged as an *extra transfer* and kept out of income: SOL, coins from other wallets, deposits not found on chain, or more USDC than has been earned.

## Features

| | |
|---|---|
| **Several websites, one ledger** | One Pay Link per website or product. Receipts are grouped by source, each with its own count, fees, net amount and TWD subtotal. |
| **Get started in 5 steps** | Add Pay Links → check receiving wallets → set up the webhook → add your MAX deposit address → import MAX CSVs. Each step says exactly where to find things in MoonPay and MAX. |
| **Google sign-in** | The deployed site uses Google sign-in only. The first account to sign in becomes the owner. Without Google keys configured, the site stays closed. |
| **Chinese and English** | The interface, guides and server messages come in both languages. Traditional Chinese is the default. |
| **Guides** | Who this is for (with a real example and a fee comparison against Patreon and Gumroad), setting up MoonPay Commerce, and cashing out through MAX. |

## Repository

```
README.md, CHANGELOG.md
SPEC.md               Early technical spec (written under the working name "TW Creator Pay")
FRONTEND_FIRST.md     Frontend-first layering and service contracts
ledger/               Detailed specs: ingestion, valuation, reconciliation, reporting, data model
dashboard/            The app (Vite 8, React 19, TypeScript 7, Tailwind CSS 4)
  server/             API: runs inside the Vite dev server locally, bundled into a Vercel Function when deployed
  api/index.js        The bundled Vercel Function, built by `npm run build:api` (commit it)
  src/                Frontend
```

Interface text sits next to where it's used, as `t('中文', 'English')` pairs, so both languages are edited together.

## Run it locally

```bash
cd dashboard
npm install
npm run dev          # http://localhost:5173 — no sign-in on localhost
```

Local settings go in `platform.config.json` and `data/`. Both are gitignored.

## Deploy to Vercel

```bash
cd dashboard
npm run build        # type check + site + api/index.js
npx vercel deploy --prod
```

Environment variables (mark them Sensitive):

| Variable | What it's for |
|---|---|
| `MOONMAX_SESSION_SECRET` | Signs the sign-in session cookie |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth client. Redirect URI: `https://<your-domain>/api/auth/google/callback` |
| `BLOB_READ_WRITE_TOKEN` | Created automatically when you connect a private Vercel Blob store |

The MoonPay webhook URL is `https://<your-domain>/api/hook/moonpay`.

> **Why `api/index.js` is pre-bundled:** TypeScript 7 no longer ships the JavaScript API that Vercel uses to compile `.ts` functions, so `vite.api.config.ts` bundles the server into plain JavaScript first.

## Known limits

- **Base:** public RPC nodes don't serve historical log queries, so Base payments come from the webhook only and aren't read from chain.
- **Exchange rates:** daily reference rates from [currency-api](https://github.com/fawazahmed0/exchange-api) for now; the plan is to switch to an official Taiwanese source.
- **Sale prices:** MAX's funds history has no sale prices, so the exchange-rate difference uses the deposit-day rate as an estimate until trade history can be imported.

## Not tax or legal advice

MoonMax Book only organises records. Ask an accountant who has handled crypto income how to report it.

See [CHANGELOG.md](CHANGELOG.md) for what changed and when.
