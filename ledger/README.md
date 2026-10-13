# TW Creator Ledger — Product Spec

> Status: draft technical spec. Supersedes the payment-facilitation framing in `../SPEC.md` — this document reflects the pivot from "we move the money" to "we reconcile the records of money that already moved elsewhere." Items marked **[VERIFY]** are unconfirmed and must be checked against live docs/APIs before being treated as fact.

## 0. What this product actually is

Not a payment processor. Not a wallet. Not an exchange. It is a **reconciliation and bookkeeping layer that sits across two services that do not know about each other**:

1. **MoonPay Commerce** (formerly Helio) — where a creator's international clients pay them in crypto.
2. **MAX** — where the creator converts that crypto to TWD and withdraws to their own Taiwan bank account.

Neither service has any reason to integrate with the other. MoonPay Commerce knows "a payment arrived." MAX knows "a withdrawal happened." Nobody produces the thing a creator actually needs once a year: *a single, coherent record of what I earned (in TWD terms, at the time I earned it) and what I later realized when I cashed it out* — the two numbers Taiwan's income tax regime actually cares about (per the general income-tax principle established earlier: payment-in-kind is valued at receipt; a later change in value on disposal is a separate, second event).

This product produces that record. It does not file taxes, does not give tax advice, and does not custody or move funds. It reads, reconciles, and reports.

## 1. Why this is narrower than it sounds, and why that's the point

General crypto tax software (Koinly, CoinTracker, et al.) already exists, is mature, and already solves cost-basis/capital-gains computation generically across many exchanges and wallets. **Do not rebuild that.** It does not, however, target this specific combination:

- It is built for **traders** (buy low, sell high, track cost basis across trades). It is not built around **income received as payment for services/content**, where the first tax event is receipt-at-fair-value, not a trade.
- It has no specific knowledge of **MAX** as a Taiwan-licensed off-ramp, nor of the Taiwan-specific reporting conventions this product's users need (NT$500k bank reporting threshold vs. actual income tax, the NT$7.5 million basic income tax threshold for overseas income, etc. — established in prior research this session).
- It is not localized for a non-crypto-native Taiwan creator who thinks of this as "money I got paid," not "a trading portfolio."

The product is deliberately small: **two data sources in, one reconciled ledger out.** Resist scope creep back toward "a payment platform."

## 2. Architecture principles (non-negotiable)

1. **Read-only, always.** This system never initiates a transaction, never holds a private key, never holds API credentials capable of moving funds on either MoonPay Commerce or MAX. It only reads records after the fact (via API where available, via user-provided export/manual entry where not).
2. **No custody, ever.** Nothing here changes the non-custodial posture established for the broader product line. If anything, this is a *more* conservative posture than the original payment-facilitation spec, since this layer doesn't even touch the payment flow — it only observes completed records.
3. **Never the final word on tax treatment.** Every output is a structured record for the creator or their accountant to use — not a filed position. Say this explicitly in the product UI, not just in this doc.
4. **Idempotent ingestion.** Every ingested record must be de-duplicatable against a stable source ID. Re-syncing, re-importing, or re-uploading the same export must never double-count.

## 3. Document index

| File | Covers |
|---|---|
| [01-ingestion.md](01-ingestion.md) | Pulling records from MoonPay Commerce and MAX; manual-entry fallback |
| [02-valuation.md](02-valuation.md) | Income recognition — fair value at time of receipt |
| [03-reconciliation.md](03-reconciliation.md) | FIFO lot-matching for realized gain/loss on disposal — the genuinely non-trivial part |
| [04-reporting.md](04-reporting.md) | Annual summary generation and export |
| [05-data-model.md](05-data-model.md) | Schema |

## 4. Before writing code, verify

1. Whether MAX exposes any **read-only** API for a user's own transaction history (distinct from a write/execution partner API, which was already ruled out in the earlier spec). Many exchanges offer this even without a partner program. **[VERIFY]**
2. Whether MoonPay Commerce's merchant API/webhooks expose enough transaction metadata (timestamp, token, chain, gross amount, payer reference) without requiring a sales/enterprise relationship — check current developer docs, not marketing pages. **[VERIFY]**
3. A reliable, citable historical USD/TWD rate source (see 02-valuation.md) — confirm licensing terms if it's a paid data API. **[VERIFY]**
4. Whether Koinly or similar already supports MAX as an importable exchange — if so, it changes nothing about the core value prop here (they still won't do the income-at-receipt-from-a-payment-processor framing or the Taiwan-specific reporting context) but is worth knowing for positioning. **[VERIFY]**
