# 04 — Reporting

## 4.1 The annual summary

For a given creator and tax year (Taiwan calendar year, 1/1–12/31), compute and present three numbers, kept visibly separate — do not collapse them into one "total":

1. **Total income recognized at receipt** — `Σ income_event.twd_value_at_receipt` for all income events in the year (§02). This is the primary figure; it exists independent of whether the creator has cashed anything out yet.
2. **Total realized gain/loss on disposal** — `Σ realized_entries.gain_loss` for all cashout events in the year (§03). Report separately as gain and loss subtotals, not only the net, since they may be treated differently.
3. **Unreconciled disposals, if any** (§3.6) — surfaced prominently, not buried in a footnote. A report with an unreconciled gap should look visibly incomplete, not quietly wrong.

Also report, as context rather than a tax figure:

4. **Still-held balance** — `Σ remaining_amount_token` across all lots, per token. This is informational: it tells the creator (and their accountant) how much recognized income has *not yet* had a second-layer disposal event, so nothing is double-counted and nothing is missed next year.

## 4.2 Export format

Produce a structured export (CSV at minimum; a formatted PDF summary is a reasonable v2) containing:
- Every income event: date, source, gross token amount, TWD value at receipt, FX rate used and its source.
- Every cashout event: date, token amount, TWD received, and its matched lot consumptions with each one's cost basis and resulting gain/loss.
- Any unreconciled disposals, flagged as such.

This is the artifact a creator hands to an accountant. Make that handoff explicit in the product's copy: label the export "Reconciliation records for your accountant or bookkeeper," not "Your tax result" — the distinction matters for what this product is allowed to imply about itself (§0 in README.md).

## 4.3 What this screen must never say

Never phrase anything as "you owe NT$X" or "your tax is NT$X." This system produces income and realized-gain figures; it does not compute a final tax liability (that depends on the creator's total income across all sources, applicable brackets, deductions, and — per earlier research this session — whether a given figure falls under domestic or overseas income treatment, which affects whether it's folded into consolidated income tax or assessed under the basic income tax (AMT) regime above the ~NT$7.5M threshold). Stating a liability figure would be giving tax advice this product is not positioned to give. State the inputs; let the creator or their accountant derive the liability.

## 4.4 Audit trail requirement

Every number on the summary screen must be traceable, by the creator or an auditor, back to the specific `income_event` or `realized_entries` row that produced it — no number should exist only as a cached aggregate with no path back to source records. This is less a UX nicety than a requirement of the product's entire reason to exist: it is being used as input to a tax filing, so "trust me" is not an acceptable property of any figure it shows.
