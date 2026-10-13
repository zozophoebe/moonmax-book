// Where the outside world comes from: MoonPay's public Pay Link data, the Solana chain and
// daily exchange rates. A sample ledger swaps in fixed data (server/sample.ts), so the same
// attribution and reconciliation code runs on it.

import type { PaylinkPreview } from '../src/types/setup'
import { payersOf, readSolanaWallet, solscanTx, type ChainTransfer, type PayerCache } from './chain'
import { ratesFor } from './fx'
import { fetchPublicPaylink, toPreview } from './moonpay'
import type { Lang } from './i18n'
import type { Storage } from './storage'

export type Sources = {
  sample: boolean
  paylink(id: string): Promise<PaylinkPreview>
  companyName(id: string): Promise<string | null>
  wallet(storage: Storage, address: string): Promise<ChainTransfer[]>
  rates(storage: Storage, isoTimes: string[]): Promise<Map<string, string | null>>
  payers(storage: Storage, txids: string[]): Promise<PayerCache>
  explorer(signature: string): string
  // Sample Pay Links are named in whichever language the page is showing.
  labelFor?(id: string, lang: Lang): string | null
}

export const liveSources: Sources = {
  sample: false,
  paylink: async (id) => toPreview(id, await fetchPublicPaylink(id)),
  companyName: async (id) => (await fetchPublicPaylink(id)).company?.name ?? null,
  wallet: readSolanaWallet,
  rates: ratesFor,
  payers: payersOf,
  explorer: solscanTx,
}
