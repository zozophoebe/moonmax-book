# 01 — Ingestion

Two independent sources. Treat them as structurally different problems — do not build one abstraction that pretends they're the same shape.

## 1.1 Source A: MoonPay Commerce (income events)

> **2026-10-12:** the source of truth for income is now the creator's receiving wallet on chain, labelled by a Global MoonPay webhook — no merchant API key. See `SPEC.md` §4 for the design and verified field shapes; the field list below still describes what an `income_event` must hold.

### Preferred path — API/webhook
If a merchant-level API or webhook feed is available **[VERIFY against current developer docs]**, subscribe to payment-confirmed events and persist each as an `income_event`:

```
income_event {
  id                    -- internal
  source                = "moonpay_commerce"
  source_tx_id          -- their transaction/payment ID, UNIQUE, used for de-dup
  creator_id
  received_at           -- UTC timestamp of on-chain confirmation, not webhook delivery time
  chain                 -- e.g. "solana", "base"
  token                 -- e.g. "USDC"
  gross_amount_token     -- decimal, in token units
  payer_reference        -- their invoice/label/memo field, if present
  raw_payload            -- store the full original response/webhook body, untouched
}
```

Always persist `raw_payload` verbatim. Fields you think you don't need today become the field you need when a dispute or an accountant's question arises in a year.

### Fallback path — CSV/manual
If no suitable API tier exists, MoonPay Commerce's own merchant dashboard almost certainly offers a transaction export; build an importer against that export format, and a manual single-entry form as the ultimate fallback (creator pastes in: date, amount, token, chain, note). The manual form is not a lesser citizen — it must write to the exact same `income_event` shape, with `source = "manual"` and `source_tx_id` generated locally (e.g. a UUID) so the de-dup logic doesn't need a special case.

### De-dup rule
Uniqueness key: `(source, source_tx_id)`. A re-import must upsert, never insert-duplicate. If an export format has no stable per-row ID, derive one deterministically from its own fields (e.g. hash of timestamp+amount+token) rather than relying on row order, which shifts between exports.

## 1.2 Source B: MAX (cashout events)

### Preferred path — read-only personal API
**[VERIFY]** whether MAX offers an authenticated, read-only endpoint for a signed-in user's own trade/withdrawal history (this is a materially different, lower-risk ask than the write/execution partner API already ruled out in the main product spec — many exchanges expose read-only personal history APIs without any partner program). If it exists, the creator authorizes a **read-only** scope only; never request a scope that can place orders or withdraw.

### Fallback path — CSV export
MAX, like essentially every exchange, provides a transaction/withdrawal history export for the account holder. This is the dependable baseline to design against — treat the read-only API as a nice-to-have upgrade, not a dependency for v1.

```
cashout_event {
  id
  source                 = "max"
  source_tx_id            -- MAX's own order/withdrawal ID
  creator_id
  executed_at             -- when the sell/withdrawal actually executed
  token_sold              -- e.g. "USDC"
  token_amount_sold        -- decimal
  twd_amount_received       -- the ACTUAL executed TWD amount — this is exact, not estimated,
                              -- because it already happened on a known exchange rate
  fee_twd
  raw_payload
}
```

Note the asymmetry with income events: a cashout event's TWD value is a known fact from the source record. An income event's TWD value is *not* in the source record (MoonPay Commerce reports the crypto amount, not its TWD worth) — that computation is §02-valuation.md's job. Do not conflate the two; a cashout event never needs a valuation lookup, an income event always does.

## 1.3 What this layer explicitly does not do

It does not call any MAX or MoonPay Commerce endpoint capable of moving money, placing an order, or changing account state. If at any point an integration path requires a scope broader than "read my own history," stop and treat that as a decision to escalate (back to the architecture principles in README.md), not a convenience to accept.
