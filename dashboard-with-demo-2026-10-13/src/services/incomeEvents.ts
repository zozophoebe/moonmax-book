import type { IncomeEvent } from '../types/ledger'
import { incomeEvents2026 } from '../demo/mocks/incomeEvents'
import { simulate } from '../demo/sim'
import { getJson } from './http'
import { isDemo } from './mode'

export async function getIncomeEvents(_creatorId: string, year: number): Promise<IncomeEvent[]> {
  if (!isDemo()) return getJson<IncomeEvent[]>(`/api/real/income-events?year=${year}`)
  return simulate({ source: 'MoonPay Commerce', failsOnError: true }, (scenario) =>
    scenario === 'empty' || year !== 2026 ? [] : incomeEvents2026,
  )
}
