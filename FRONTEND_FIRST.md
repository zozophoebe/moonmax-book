# Building the dashboard frontend-first

> Goal: build and iterate on the UI against realistic mock data now, then swap in the real backend (MoonPay Commerce ingestion, MAX ingestion, the FIFO reconciliation engine in `ledger/03-reconciliation.md`) later — without rewriting components to do it. This only works if the seam between "fake data" and "real data" is drawn in the right place *before* you start, not discovered afterward.

## 1. The one rule that makes this work

**Components never fetch data and never compute anything. They only receive already-shaped data as props/hook results, and render it.** Every other guideline in this document exists to enforce that one rule. If you only remember one thing from this doc, remember this — violating it quietly is how "swap in the backend" turns into "rewrite half the frontend."

## 2. The contract layer — define this first, before any UI code

> **Authoritative version:** `dashboard/src/types/ledger.ts`. The sketch below was the starting point; the implemented contract adds per-chain held balances (`stillHeld: HeldBalance[]`, needed for the MAX network-matching panel), the FIFO slices on each cashout (`consumptions: LotConsumption[]`), and unmatched amounts for unreconciled cashouts. When they disagree, the code wins.
>
> **Open decision:** the mock data runs FIFO per *token + chain* (Solana USDC and Base USDC as separate lot queues), while `ledger/03-reconciliation.md` §3.4 specifies per *token*. Per token+chain keeps "tax lots still held" equal to "balance physically on that chain"; per token pools them. Confirm with an accountant before the backend implements it.

Write the TypeScript types for every data shape the dashboard will display, matching `ledger/05-data-model.md`'s entities but as frontend-facing view models (not raw DB rows). Put these in one place, imported from everywhere, owned by nobody's individual component:

```ts
// types/ledger.ts

export type IncomeEvent = {
  id: string
  receivedAt: string          // ISO 8601
  source: 'moonpay_commerce' | 'manual'
  chain: string
  token: string
  grossAmountToken: string    // string, not number — see §6.1
  twdValueAtReceipt: string
  payerReference: string | null
}

export type CashoutEvent = {
  id: string
  executedAt: string
  tokenSold: string
  tokenAmountSold: string
  twdAmountReceived: string
  isUnreconciled: boolean      // see ledger/03-reconciliation.md §3.6 — must be renderable
}

export type AnnualSummary = {
  year: number
  totalIncomeTwd: string
  totalRealizedGainTwd: string
  totalRealizedLossTwd: string
  stillHeldByToken: Record<string, string>
  unreconciledCashoutIds: string[]
}
```

This file is the actual contract between frontend and backend. When the backend is finally wired in, the test of success is: **this file does not change.** If building the real backend forces you to edit `types/ledger.ts`, the original contract was wrong somewhere — that's useful signal, but it means the frontend work built against the wrong assumption and some of it needs revisiting. Get this file reviewed against `ledger/05-data-model.md` and `04-reporting.md` carefully before building UI on top of it, because every screen downstream inherits whatever's wrong here.

## 3. The service layer — the only seam that changes later

One file per entity, exporting functions with this shape:

```ts
// services/incomeEvents.ts

export async function getIncomeEvents(creatorId: string): Promise<IncomeEvent[]> {
  // TODAY: return mock data (§4)
  // LATER: fetch(`/api/creators/${creatorId}/income-events`)
  // The function signature does not change between these two states.
}
```

Rules for this layer:
- **Async from day one**, even though the mock implementation doesn't need to be. A function that returns `IncomeEvent[]` directly today and `Promise<IncomeEvent[]>` tomorrow is a breaking change to every caller. Return a `Promise` now, always, so nothing downstream has to change later.
- **One function per actual use case**, not one giant "get everything" blob — `getIncomeEvents(creatorId)`, `getCashoutEvents(creatorId)`, `getAnnualSummary(creatorId, year)`. This mirrors how the real API will be shaped (per-resource endpoints) and keeps each mock swappable independently instead of as one monolith.
- **Components and hooks import only from `services/`, never from `mocks/` directly.** This is the actual enforcement mechanism for §1 — if a component reaches past the service layer to grab mock data directly "just this once," the seam is broken and you won't find out until the rewrite.

## 4. Mock data — treat it as seriously as real fixtures, not placeholder junk

### 4.1 Cover the edge cases the real data will have, not just the happy path
Per `ledger/03-reconciliation.md` and `04-reporting.md`, the real system will produce:
- Ordinary confirmed income events and cleanly-matched cashouts (the happy path — necessary but not sufficient).
- At least one **unreconciled** cashout (§3.6) — if the UI is never built against this state, the first time it appears in production will be the first time anyone sees how it actually renders.
- An **empty state** — a brand-new creator with zero events yet. Empty states designed last are usually bad; design this one deliberately, not as an afterthought.
- A **partial-year / mid-year** view where `stillHeldByToken` is non-zero — the "you have income recognized but not yet cashed out" state, which is informational, not an error, and should look calm, not alarming.

### 4.2 Where mocks live
```
mocks/
  incomeEvents.ts     -- fixture arrays, typed as IncomeEvent[]
  cashoutEvents.ts
  annualSummary.ts
```
Each mock file's exported data must satisfy the exact types in `types/ledger.ts` — if TypeScript doesn't complain, the mock is shaped correctly by construction. This is one of the main reasons §2 has to come first.

### 4.3 Simulate latency and failure, not just instant success
```ts
export async function getIncomeEvents(creatorId: string): Promise<IncomeEvent[]> {
  await simulatedDelay(300, 900)           // real networks are not instant
  if (shouldSimulateError()) throw new ApiError(...)  // behind a dev-only toggle
  return mockIncomeEvents
}
```
If every mock resolves instantly and never fails, the loading skeletons and error states either don't get built at all, or get built last, rushed, and untested. Build them now, against a simulated delay, while it's cheap.

## 5. What must never be computed in the frontend

The FIFO lot-matching algorithm (`ledger/03-reconciliation.md`) and the FX valuation logic (`ledger/02-valuation.md`) are **backend-only computations.** The frontend never re-implements them, not even in the mock layer. Mock data for `AnnualSummary` should look like *the output* of that algorithm already having run (a plausible-looking `totalRealizedGainTwd`), not a set of raw income/cashout events that the frontend then adds up itself.

Why this matters beyond the obvious scope reason: if the mock layer quietly reimplements a simplified version of the FIFO matching "just to make the numbers look right" in a demo, and the real backend later implements the actual algorithm from `03-reconciliation.md`, you now have two implementations that will disagree on edge cases — and because the frontend one was never meant to be correct, nobody will have tested it against §3.6–3.7. Keep computed outputs as opaque numbers the frontend receives and trusts.

## 6. Coding standards

### 6.1 Money and token amounts are strings, never `number`
JavaScript's `number` is a float; floats lose precision on arithmetic in ways that are invisible until they aren't, and this product's entire purpose is producing numbers an accountant will check. Represent every amount (TWD or token) as a **string** in the contract layer and in all component props. Parse to a decimal library (e.g. `decimal.js` or `big.js`) only at the point of doing arithmetic (which, per §5, should rarely if ever happen in the frontend) or formatting for display. Never do `a + b` on two amount fields directly as JS numbers anywhere in this codebase.

### 6.2 Timestamps are ISO 8601 strings, UI owns the timezone presentation
Per `ledger/02-valuation.md` §2.4, the backend will have made a deliberate choice about which day a near-midnight transaction belongs to (Taiwan local time). The frontend's job is display, not re-deciding that boundary — format ISO strings for display using Taiwan local time consistently, and don't write any date-bucketing logic in the frontend that could disagree with what the backend already decided.

### 6.3 Component split: presentational vs. container
- **Presentational components** (`components/`): receive fully-shaped data as props, contain zero data-fetching, zero service-layer imports. These are the components you can render in isolation with hand-written mock props and see exactly what a user sees — build and review these first.
- **Container components** (`app/.../page.tsx` or equivalent): the only place allowed to call `services/*` functions, handle loading/error states, and pass resolved data down to presentational components as props.

This split is what makes "swap the backend" a one-file change per entity (the service function) rather than a hunt through every component that happens to reference data.

### 6.4 TypeScript strictness
`strict: true`. No `any` on anything that crosses the `types/ledger.ts` boundary — if a shape is genuinely unknown at some point, that's a sign the contract (§2) needs a real answer, not a type-level escape hatch that defers the problem.

### 6.5 File/folder layout (reference)
```
types/
  ledger.ts              -- §2, the contract
services/
  incomeEvents.ts         -- §3
  cashoutEvents.ts
  annualSummary.ts
mocks/
  incomeEvents.ts         -- §4
  cashoutEvents.ts
  annualSummary.ts
components/
  IncomeEventList.tsx      -- §6.3, presentational
  CashoutEventList.tsx
  AnnualSummaryCard.tsx
  UnreconciledWarning.tsx   -- built deliberately, not skipped (§4.1)
app/
  dashboard/
    page.tsx                -- §6.3, container — the only caller of services/
```

## 7. Checklist before wiring in the real backend

- [ ] `types/ledger.ts` has not needed a shape change since the UI was built against it (if it has, that's fine — just means this checklist caught the drift before it became a production bug).
- [ ] Every `services/*` function is already `async` and already returns the documented `Promise<T>` shape — swapping the body from "return mock" to "fetch real" should be the entire diff.
- [ ] No component imports anything from `mocks/` directly.
- [ ] The unreconciled-cashout state, the empty state, a loading state, and an error state have all actually been seen on screen during frontend-only development — not just theorized about.
- [ ] No arithmetic on amount fields happens anywhere in frontend code outside of a formatting function at the point of display.
