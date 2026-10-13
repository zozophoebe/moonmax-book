// Frontend ↔ backend contract. Mirrors ledger/05-data-model.md as view models.
// Every amount is a decimal string, never a JS number (FRONTEND_FIRST.md §6.1).
// Every timestamp is an ISO 8601 string in UTC; the UI formats it in Asia/Taipei.

export type Chain = 'solana' | 'base'

export type Creator = {
  id: string
  companyName: string | null // from the first Pay Link's MoonPay account
  sourceCount: number
}

export type IncomeEvent = {
  id: string
  source: 'moonpay_commerce' | 'manual'
  sourceTxId: string
  receivedAt: string
  chain: Chain
  token: string
  grossAmountToken: string
  usdPerToken: string
  fxRateTwdPerUsd: string
  fxRateSource: string
  twdValueAtReceipt: string
  payerReference: string | null
}

// One slice of an income lot consumed by a cashout, per ledger/03-reconciliation.md §3.5.
export type LotConsumption = {
  lotId: string
  incomeEventId: string
  incomeReceivedAt: string
  payerReference: string | null
  consumedAmountToken: string
  costBasisTwd: string
  proceedsTwd: string
  gainLossTwd: string
}

export type CashoutEvent = {
  id: string
  source: 'max' | 'manual'
  sourceTxId: string
  executedAt: string
  chain: Chain
  tokenSold: string
  tokenAmountSold: string
  twdAmountReceived: string
  feeTwd: string
  consumptions: LotConsumption[]
  // Sum of consumptions[].gainLossTwd. Null only if nothing could be matched at all.
  gainLossTwd: string | null
  // ledger/03-reconciliation.md §3.6 — outflow larger than recorded inflow.
  isUnreconciled: boolean
  unmatchedAmountToken: string | null
  unmatchedProceedsTwd: string | null
}

export type HeldBalance = {
  chain: Chain
  token: string
  amountToken: string
}

export type AnnualSummary = {
  year: number
  asOf: string
  matchingMethod: 'FIFO'
  fxRateSource: string
  incomeEventCount: number
  cashoutEventCount: number
  totalIncomeTwd: string
  totalRealizedGainTwd: string
  totalRealizedLossTwd: string
  totalCashoutTwd: string
  stillHeld: HeldBalance[]
  unreconciledCashoutIds: string[]
}

export type DepositAddress = {
  chain: Chain
  token: string
  address: string
  // Self-reported by the creator during MAX onboarding (SPEC.md §5.2) — never fetched.
  addedAt: string
}

export type SourceStatus = {
  moonpayCommerce: {
    connected: boolean
    lastSyncedAt: string | null
  }
  max: {
    method: 'csv' | 'read_only_api' | 'none'
    lastImportedAt: string | null
    fileName: string | null
  }
}

export type ExportReceipt = {
  year: number
  fileName: string
  generatedAt: string
}
