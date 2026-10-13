import type { AnnualSummary } from '../types/ledger'
import { annualSummary2026 } from '../demo/mocks/annualSummary'
import { simulate } from '../demo/sim'
import { getJson } from './http'
import { isDemo } from './mode'

const emptySummary = (year: number): AnnualSummary => ({
  year,
  asOf: '2026-10-08T06:20:00Z',
  matchingMethod: 'FIFO',
  fxRateSource: '中央銀行每日參考匯率',
  incomeEventCount: 0,
  cashoutEventCount: 0,
  totalIncomeTwd: '0',
  totalRealizedGainTwd: '0',
  totalRealizedLossTwd: '0',
  totalCashoutTwd: '0',
  stillHeld: [],
  unreconciledCashoutIds: [],
})

export async function getAnnualSummary(_creatorId: string, year: number): Promise<AnnualSummary> {
  if (!isDemo()) return getJson<AnnualSummary>(`/api/real/summary?year=${year}`)
  return simulate({ source: '對帳引擎', failsOnError: true }, (scenario) =>
    scenario === 'empty' || year !== 2026 ? emptySummary(year) : annualSummary2026,
  )
}
