import type { DepositAddress } from './ledger'

// What the setup wizard knows about the real platform. Never contains secrets.

// Where a Pay Link sends money: one entry per chain the creator set up in MoonPay.
export type PaylinkRecipient = {
  chain: string // display name from MoonPay, e.g. "Solana", "Base"
  engine: 'SOL' | 'EVM' | 'BTC' | string
  token: string
  address: string
}

export type PaylinkPreview = {
  id: string
  name: string
  priceToken: string
  token: string
  chain: string
  active: boolean
  hostedUrl: string
  redirectUrl: string | null
  requireEmail: boolean
  canSwapTokens: boolean
  canPayWithCard: boolean
  companyName: string | null
  kycVerified: boolean
  kybVerified: boolean
  recipients: PaylinkRecipient[]
}

export type PaylinkEntry = {
  id: string
  label: string | null
  siteUrl: string | null
  preview: PaylinkPreview | null
  error: string | null
}

// A receiving wallet, collected from every Pay Link that pays into it.
export type ReceivingWallet = {
  chain: string
  engine: string
  address: string
  paylinkIds: string[]
  // Whether MoonMax Book can read this wallet's history from the public chain today.
  readable: boolean
  limit: WalletLimit
}

// Why a wallet can't be read from the chain (null = readable).
export type WalletLimit = null | { kind: 'token'; token: string } | { kind: 'webhook-only' }

export type WebhookState = {
  configured: boolean
  tokenHint: string | null // last 4 characters only
  savedAt: string | null
  eventCount: number
  lastEventAt: string | null
  hookPath: string
}

export type SetupState = {
  checkedAt: string
  paylinks: PaylinkEntry[]
  wallets: ReceivingWallet[]
  webhook: WebhookState
  maxDepositAddresses: DepositAddress[]
  maxImport: { files: number; records: number; lastImportedAt: string | null }
  sample: boolean // showing the sample ledger; writes are blocked until it's cleared
}
