import type { WalletLimit } from './setup'

// Real-platform receipts, read from the public chain (C) and labelled by MoonPay webhooks (B).
// Amounts are decimal strings, same rule as types/ledger.ts.

// How a receipt was tied to a Pay Link. Only 'webhook' is certain.
export type Attribution =
  | 'webhook' // MoonPay's notification named the Pay Link
  | 'only-paylink' // guess: the only registered Pay Link paying into this wallet
  | 'price-match' // guess: amount matches one Pay Link's price
  | 'unmatched' // came through MoonPay, but no way to tell which Pay Link
  | 'not-moonpay' // a plain transfer into the wallet, not a MoonPay payment

export type ReceiptTotals = {
  count: number
  tokens: string[] // stablecoins summed in this group, each counted as 1 USD
  grossTotalToken: string
  feeTotalToken: string
  netTotalToken: string
  twdTotal: string | null // null when any receipt in the group has no rate yet
}

export type ReceiptSource = ReceiptTotals & {
  key: string // paylink id, 'unmatched' or 'other'
  kind: 'paylink' | 'unmatched' | 'other'
  label: string | null // the creator's name for it, else MoonPay's; the UI words the rest
  paylinkName: string | null
  siteUrl: string | null
  registered: boolean // false when a webhook names a Pay Link not added to MoonMax Book
}

export type Receipt = {
  id: string // transaction signature
  receivedAt: string
  chain: string
  token: string
  wallet: string
  grossToken: string | null // what the buyer paid
  feeToken: string | null // MoonPay's cut
  netToken: string // what arrived in the wallet
  sourceKey: string
  attribution: Attribution
  verifiedOnChain: boolean
  fxRateTwdPerUsd: string | null
  twdValue: string | null // gross × rate, rounded to whole NT$
  explorerUrl: string
}

export type OutgoingTransfer = {
  id: string
  sentAt: string
  chain: string
  token: string
  amountToken: string
  from: string // the receiving wallet it left
  to: string | null
  toMax: boolean
  explorerUrl: string
}

export type WalletRead = {
  chain: string
  address: string
  readable: boolean
  error: string | null
  limit: WalletLimit
}

export type ReceiptsView = {
  checkedAt: string
  fxRateSource: 'currency-api'
  sources: ReceiptSource[]
  // Every MoonPay payment (all Pay Links + unmatched). Plain transfers ('other') are not income.
  totals: ReceiptTotals
  receipts: Receipt[]
  outgoing: OutgoingTransfer[]
  wallets: WalletRead[]
  webhookConfigured: boolean
}
