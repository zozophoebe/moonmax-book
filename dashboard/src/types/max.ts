// MAX cash-out reconciliation (server/max.ts). Amounts are decimal strings; TWD has 2 decimals.

export type MaxImportResult = { added: number; duplicates: number; skipped: number; total: number }

// Why part of a MAX deposit isn't covered by MoonPay income.
export type ExtraKind =
  | 'other-asset' // not a stablecoin from MoonPay (e.g. SOL you sent yourself)
  | 'other-wallet' // sent from a wallet that isn't one of your receiving wallets
  | 'not-found' // couldn't find the transaction on chain
  | 'beyond-income' // more USDC than your MoonPay income so far

export type ReconLot = {
  receiptId: string
  receivedAt: string
  sourceKey: string
  amount: string
  costTwd: string // TWD value when it was received
  rateAtReceipt: string
}

export type ReconRow = {
  id: string // Txid + coin + amount (one transaction can have several rows)
  txid: string // from MAX
  at: string
  currency: string
  amount: string
  status: string
  origin: 'receiving-wallet' | 'other-wallet' | 'not-found'
  fromWallet: string | null
  matched: {
    token: string
    amount: string
    lots: ReconLot[]
    costTwd: string
    rateAtDeposit: string | null
    valueTwd: string | null // TWD value on the deposit day (estimate until sale prices are imported)
    fxDiffTwd: string | null // valueTwd − costTwd
  } | null
  extra: { kind: ExtraKind; currency: string; amount: string } | null
}

export type ReconView = {
  checkedAt: string
  files: { name: string; rows: number; importedAt: string }[]
  rows: ReconRow[]
  totals: { matchedToken: string; costTwd: string; valueTwd: string | null; fxDiffTwd: string | null; extras: { currency: string; amount: string }[] }
  remainingIncome: { token: string; amount: string }[] // MoonPay income not moved to MAX yet
  detectedMaxAddresses: string[]
  maxAddressSet: boolean
}
