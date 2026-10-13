# 02 — Valuation (income recognition)

## 2.1 The principle

An individual who receives crypto as payment for services or content recognizes income at **the fair value of what was received, at the time it was received** — this was established in earlier research this session: payment-in-kind is valued at receipt for income purposes, independent of what happens to that asset afterward. This is the same logic as being paid in a foreign currency or in goods: the TWD value *on the day you got it* is the income figure, full stop.

This means: `income_event.twd_value_at_receipt` can and must be computed **immediately upon ingestion**, using only that event's own timestamp and amount. It never depends on anything that happens later (a subsequent price move, a later cashout) — that later-value question is a completely separate computation, handled in §03.

## 2.2 Computing it

```
twd_value_at_receipt = gross_amount_token × usd_per_token(token, received_at) × twd_per_usd(received_at)
```

For `usd_per_token`: if `token == "USDC"`, treat as effectively 1.00 USD — but **pull an actual rate rather than hardcoding 1.00**. USDC de-pegs have happened historically, even if briefly; a hardcoded constant silently produces a wrong number on exactly the days it matters most, and an accountant reviewing the ledger will ask where the number came from. Use a price oracle or exchange reference rate, store the value used, and move on — the common case will show 1.00 or something indistinguishable from it anyway.

For `twd_per_usd`: this is the part that needs a real, citable, historical source.

## 2.3 FX rate source

**[VERIFY before building]** — options, roughly in order of how defensible they are for this use case:

1. **台灣中央銀行 (Central Bank of the ROC) published daily reference rate.** Most defensible if a creator's accountant ever asks "where did this number come from" — it's the rate a Taiwan tax authority context would expect. Confirm current publication format/access method (historical lookup, not just today's rate) before committing.
2. A commercial FX data API with historical daily rates (confirm licensing covers this use case — redistributing rates inside a product sometimes has different terms than looking one up for personal reference).
3. An on-chain/crypto price oracle's USD/TWD cross rate, if one with adequate historical depth exists — treat as a fallback, not the primary source, since its provenance is less obviously "official" than a central bank rate if ever questioned.

Whichever is chosen, **store the rate actually used alongside the computed value**, not just the final TWD number — `income_event.fx_rate_used` and `income_event.fx_rate_source`. This is what makes the ledger auditable rather than a black box.

## 2.4 Timestamp precision

Use the *date* of receipt (not necessarily intraday time) to look up the rate, matching how most official daily-reference-rate sources are published (one rate per day, not continuously). Pin down which timezone's "day" a near-midnight UTC transaction falls into — pick Taiwan local time consistently, since that's the jurisdiction this record is for, and document the choice once rather than re-deciding it per transaction.

## 2.5 What this step outputs

Every `income_event` gains two fields: `twd_value_at_receipt` (the number), and the rate/source metadata above. Summed across a year, this is the primary number for the annual income report (§04) — and this number is *final* the moment it's computed. Nothing downstream ever revises it.
