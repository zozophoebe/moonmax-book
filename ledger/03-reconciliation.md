# 03 — Reconciliation (FIFO lot-matching for realized gain/loss)

This is the one genuinely non-trivial computation in the system. Everything else in this product is CRUD and arithmetic; this is an accounting algorithm with real edge cases, and getting it conceptually wrong produces numbers that look plausible and are quietly incorrect. Read this whole file before implementing it.

## 3.1 Why this problem exists at all

Once USDC lands in a creator's wallet, it is **fungible** — a token-account balance, not a set of individually-tagged coins. If a creator receives five separate $100 payments and later withdraws $500 to MAX in one transaction, there is no on-chain or cryptographic fact that says "this withdrawal was specifically payments #2 and #4." That lineage simply does not exist once funds are pooled in a shared balance.

This is **not a blockchain-indexing problem to solve with better data.** It is the same problem security cost-basis accounting has always had, and it has the same class of solution: an **accounting convention**, not a discovered fact. You are choosing which lot to "charge" against a disposal, the same way an investor's broker chooses which purchased shares to treat as sold when they don't specify.

## 3.2 Why this computation matters

§02 already gives you the *income* number (value at receipt) — that's independent of this section entirely. This section exists because of the *second* tax event flagged earlier in this product's research: if the crypto's value moved between receipt and the eventual cashout/disposal, that difference is a separate gain-or-loss event (characterized earlier as the "財產交易所得" layer, distinct from ordinary income). Computing *that* number requires knowing, for the specific units being disposed of, what their cost basis was — and cost basis is only knowable through a chosen matching convention.

## 3.3 The convention: FIFO

Use **First-In-First-Out**: when a disposal (cashout) consumes token units, it consumes them from the oldest still-unconsumed income lot(s) first.

Why FIFO specifically, and not LIFO or specific-identification:
- It requires no additional input from the creator (specific-identification would require them to assert, at the moment of each withdrawal, *which* historical payment they intend to be cashing out — unrealistic for someone casually withdrawing a pooled balance).
- It is the most commonly defaulted-to convention in the absence of specific identification, across jurisdictions generally.
- It is deterministic and auditable from the ledger's own data alone.

**Document this choice visibly in any report this system produces** (§04) — label it explicitly as "FIFO 先進先出法" or similar, because an accountant reviewing the output needs to know a convention was applied, not assume it's a cryptographically-derived fact. If official Taiwan guidance on crypto cost-basis methodology solidifies in a way that prefers a different convention, this is the one piece of this system that may need to be recomputed retroactively — isolate the matching logic so that's a re-run, not a rewrite.

## 3.4 Data structure: the lot queue

Maintain, per creator, an ordered queue of **lots**, where each lot is derived from one `income_event`:

```
lot {
  id
  creator_id
  source_income_event_id      -- FK back to §01/§02's income_event
  token
  original_amount_token        -- the full amount this lot started with
  remaining_amount_token         -- decremented as it's consumed by disposals; starts == original
  cost_basis_twd_per_token        -- = income_event.twd_value_at_receipt / original_amount_token
  received_at                      -- inherited, used for queue ordering
}
```

Lots are created once, at ingestion time (§01/§02), and only ever *decremented*, never re-created or re-ordered. `remaining_amount_token` reaching zero means the lot is exhausted but should not be deleted — it's part of the audit trail.

## 3.5 The matching algorithm

On each `cashout_event` (a disposal of `token_amount_sold` units of `token`, realizing `twd_amount_received`):

1. Compute the disposal's **TWD value per token unit**: `disposal_twd_per_token = twd_amount_received / token_amount_sold`.
2. Fetch all lots for this creator and token with `remaining_amount_token > 0`, ordered by `received_at ASC` (oldest first).
3. Walk the queue, consuming from each lot in order:
   ```
   remaining_to_match = token_amount_sold
   realized_entries = []

   for lot in lots_oldest_first:
       if remaining_to_match <= 0: break
       consumed = min(lot.remaining_amount_token, remaining_to_match)

       cost_basis_for_consumed = consumed × lot.cost_basis_twd_per_token
       proceeds_for_consumed   = consumed × disposal_twd_per_token
       gain_loss               = proceeds_for_consumed − cost_basis_for_consumed

       realized_entries.append({ lot.id, consumed, cost_basis_for_consumed,
                                  proceeds_for_consumed, gain_loss })

       lot.remaining_amount_token -= consumed
       remaining_to_match -= consumed

   if remaining_to_match > 0:
       # see §3.6 — do not silently ignore this
   ```
4. Persist `realized_entries` as child records of the `cashout_event` — the sum of their `gain_loss` is this disposal's total realized gain/loss, and the sum across all disposals in a year is the second number for §04's annual report.

## 3.6 Edge case: disposal exceeds available lots

If `remaining_to_match > 0` after walking every available lot, the ledger has more recorded outflow than recorded inflow for that token. This is a **data integrity signal, not a number to approximate.** Likely causes: a missing income event (an import gap, a payment received before this system started tracking), or the creator holding/transferring crypto through paths this ledger doesn't see at all (e.g. moved funds in from a source other than MoonPay Commerce).

Do not invent a cost basis of zero or guess a backfilled lot to make the arithmetic close. Flag the disposal as **unreconciled** in the UI and in any export, and say so plainly: "this withdrawal couldn't be fully matched to recorded income — treat the resulting gain/loss figure as incomplete." A wrong number that looks confident is worse than a visible gap.

## 3.7 Edge case: partial-lot consumption across multiple disposals over time

Normal and expected — a single lot may be split across several future cashout events as the creator withdraws gradually. The `remaining_amount_token` decrement handles this correctly as written; no special-casing needed beyond what §3.5 already does.

## 3.8 What this step explicitly is not

It is not a live, continuous repricing of held assets (no mark-to-market on unrealized balances — only realized events on disposal get a gain/loss computed, consistent with how this kind of income is generally treated: unrealized appreciation isn't a taxable event). It is not a replacement for an accountant's judgment on which matching convention is ultimately correct for a given filing — it is a consistent, auditable default that produces the inputs an accountant would otherwise have to reconstruct by hand.
