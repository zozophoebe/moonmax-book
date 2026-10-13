import type { ExportReceipt } from '../types/ledger'
import { simulate } from '../demo/sim'
import { ApiError } from './http'
import { isDemo } from './mode'

// Backend generates the accountant export (ledger/04-reporting.md §4.2); the UI only requests it.
export async function requestAccountantExport(_creatorId: string, year: number): Promise<ExportReceipt> {
  if (!isDemo()) throw new ApiError('匯出', '匯出要等帳本有交易後才能用。')
  return simulate({ source: '匯出', failsOnError: false }, () => ({
    year,
    fileName: `MoonMaxBook_${year}_供會計師使用.csv`,
    generatedAt: new Date().toISOString(),
  }))
}
