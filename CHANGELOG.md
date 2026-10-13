# Changelog

This repository has used git since 2026-10-13. There was no version history before that, so the earlier sections are milestones pieced together from the development notes. From here on, each major feature gets its own commit.

## 2026-10-13

- **English repository.** README, changelog and specs rewritten in English. The repository is now public. The pre-removal demo snapshot (`dashboard-with-demo-2026-10-13/`) is no longer tracked.
- **MAX cash-out reconciliation.** Step 5 of Get started takes MAX funds-history CSVs. You can upload several at once, duplicates are skipped, and a zip file gets a reminder to unzip it first. Each deposit is traced on chain by its transaction ID. USDC from a receiving wallet is matched first-in, first-out against MoonPay income, with its TWD value when received, on the deposit day, and the exchange-rate difference. Anything that isn't MoonPay income is flagged as an extra transfer and kept out of income: SOL, transfers from other wallets, deposits not found on chain, or more than the income so far. The Receipts page gets a per-deposit "Cash-out reconciliation (MAX)" card, and a deposit address seen in the MAX records can be saved as your MAX address in one click. When MAX lists USDC and SOL from the same transaction, they count as separate rows rather than duplicates.
- **Browser tab icon uses the new logo.** Added PNG versions (Safari ignores SVG icons) and an apple-touch-icon. The links carry `?v=2` so browsers drop the old cached icon.
- **New logo.** A pixel moon: a white full moon whose right half dissolves into a checkerboard.
- **Chinese / English toggle.** Every screen, guide and server error message is available in both languages, and the choice is remembered.
- **Guides rewritten.** "Who it's for" now uses large cards with icons. A fee comparison shows how much of a US$19 plugin sale you keep on MoonPay, Patreon and Gumroad. A 7-step walkthrough uses Frame → Lottie as a real example. Each article gets an automatic table of contents.
- **Removed the integration check page.**
- **Google sign-in only.** The deployed site accepts only the owner's Google account, and the first account to sign in becomes the owner. Without Google keys configured, the whole site stays closed.
- **Deployed to Vercel.** The same API runs inside Vite locally and as a Vercel Function when deployed. Data lives in a private Vercel Blob store.
- **Removed the demo ledger.** The nav entry, `/demo/` and all mock data are gone. A full copy was kept locally.
- **Fixed payment attribution.** When a wallet has a single Pay Link, the guess now also requires the amount to match its price, so payments from other Pay Links aren't counted against it.
- **Reads USDT.** Both USDC and USDT on Solana are read. USDT receipts are labelled "MAX may not accept".

## Earlier: 2026-10-12

- **No API keys.** Payments are read from the receiving wallets on the public blockchain. The MoonPay webhook is used only to tag each payment with its Pay Link. Webhooks are verified with a Bearer token and an HMAC signature, and buyer details are discarded on arrival.
- **Receipts for several websites.** One Pay Link per website. Receipts are split into tabs by source with their own subtotals, and TWD values use the rate on the day each payment arrived.
- **Renamed to MoonMax Book.** Added the first logo. Get started now walks through the setup from an empty state. The demo ledger moved to `/demo/`.

## Earlier: 2026-10-11

- Redesigned in a white-and-grey shadcn style with a yellow accent. The app detects real MoonPay payment links. Added three guides.

## Earlier: 2026-10-08

- Product spec (`SPEC.md`, `ledger/`, `FRONTEND_FIRST.md`). A frontend-first ledger UI, with mock data standing in for the backend.
