import type { ReceiptsView } from '../types/receipts'
import { demoReceipts } from '../demo/mocks/receipts'
import { simulate } from '../demo/sim'
import { getJson } from './http'
import { isDemo } from './mode'

// Real: read from the public chain and labelled by MoonPay webhooks. Demo: a multi-site fixture.
export async function getReceipts(): Promise<ReceiptsView> {
  if (!isDemo()) return getJson<ReceiptsView>('/api/real/receipts')
  return simulate({ source: '區塊鏈', failsOnError: true }, (scenario) =>
    scenario === 'empty' ? { ...demoReceipts, sources: [], receipts: [], outgoing: [], totals: { count: 0, grossTotalToken: '0.00', feeTotalToken: '0.00', netTotalToken: '0.00', twdTotal: '0' } } : demoReceipts,
  )
}
