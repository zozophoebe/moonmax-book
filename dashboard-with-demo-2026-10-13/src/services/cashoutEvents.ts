import type { CashoutEvent } from '../types/ledger'
import { cashoutEvents2026 } from '../demo/mocks/cashoutEvents'
import { simulate } from '../demo/sim'
import { getJson } from './http'
import { isDemo } from './mode'

export async function getCashoutEvents(_creatorId: string, year: number): Promise<CashoutEvent[]> {
  if (!isDemo()) return getJson<CashoutEvent[]>(`/api/real/cashout-events?year=${year}`)
  return simulate({ source: 'MAX', failsOnError: true }, (scenario) =>
    scenario === 'empty' || year !== 2026 ? [] : cashoutEvents2026,
  )
}
