# 05 — Data model

Consolidated schema referenced across §01–§04. Postgres-flavored notation; adapt types as needed, but keep the relationships and constraints as written — they encode decisions made in the other documents, not arbitrary choices.

```sql
creators (
  id                  uuid primary key,
  display_name        text,
  locale              text default 'zh-TW',
  created_at          timestamptz
)

income_events (
  id                      uuid primary key,
  creator_id              uuid references creators(id),
  source                  text not null,              -- 'moonpay_commerce' | 'manual'
  source_tx_id            text not null,
  received_at             timestamptz not null,
  chain                   text,
  token                   text not null,
  gross_amount_token      numeric not null,
  payer_reference         text,
  twd_value_at_receipt    numeric,                      -- computed, §02
  fx_rate_used            numeric,                       -- computed, §02
  fx_rate_source          text,                           -- computed, §02
  raw_payload             jsonb not null,
  created_at              timestamptz,

  unique (source, source_tx_id)                            -- de-dup, §01.3
)

lots (
  id                          uuid primary key,
  creator_id                  uuid references creators(id),
  source_income_event_id      uuid references income_events(id) unique,
  token                       text not null,
  original_amount_token       numeric not null,
  remaining_amount_token      numeric not null check (remaining_amount_token >= 0),
  cost_basis_twd_per_token    numeric not null,
  received_at                 timestamptz not null         -- denormalized from income_events for FIFO ordering
)
-- one lot is always created 1:1 from one income_event, at the point §02's valuation completes.

cashout_events (
  id                      uuid primary key,
  creator_id              uuid references creators(id),
  source                  text not null,              -- 'max' | 'manual'
  source_tx_id            text not null,
  executed_at             timestamptz not null,
  token_sold              text not null,
  token_amount_sold       numeric not null,
  twd_amount_received     numeric not null,
  fee_twd                 numeric default 0,
  is_unreconciled         boolean default false,         -- set true per §3.6
  raw_payload             jsonb not null,
  created_at              timestamptz,

  unique (source, source_tx_id)
)

realized_entries (
  id                          uuid primary key,
  cashout_event_id            uuid references cashout_events(id),
  lot_id                      uuid references lots(id),
  consumed_amount_token       numeric not null,
  cost_basis_for_consumed_twd numeric not null,
  proceeds_for_consumed_twd   numeric not null,
  gain_loss_twd               numeric not null              -- = proceeds - cost_basis, §3.5
)
-- one cashout_event produces one-or-more realized_entries (one per lot it drew from).
```

## Notes on constraints worth keeping

- `remaining_amount_token >= 0` on `lots` is a cheap, valuable sanity check — the matching algorithm in §03 should never be able to violate it; if it does, that's a bug, not an edge case to handle gracefully.
- `unique (source, source_tx_id)` on both event tables is what makes re-imports/re-syncs safe (§01.3). Enforce it at the database level, not only in application logic.
- `lots.source_income_event_id` is `unique` because the 1:1 relationship to its origin `income_event` is structural, not incidental — a lot never merges, splits into multiple lots, or gets created from more than one income event.
- Nothing in this schema stores a mutable "current balance" as its own field anywhere — the running held balance (§4.1's point 4) is always a derived sum over `lots.remaining_amount_token`, never a separately-maintained counter that could drift out of sync with the ledger it's supposed to summarize.
