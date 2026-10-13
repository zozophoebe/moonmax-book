import type { SourceStatus } from '../types/ledger'
import { mockSourceStatus, mockSourceStatusEmpty } from '../demo/mocks/sourceStatus'
import { simulate } from '../demo/sim'
import { getJson } from './http'
import { isDemo } from './mode'

export async function getSourceStatus(_creatorId: string): Promise<SourceStatus> {
  if (!isDemo()) return getJson<SourceStatus>('/api/real/source-status')
  return simulate({ source: 'account', failsOnError: false }, (scenario) =>
    scenario === 'empty' ? mockSourceStatusEmpty : mockSourceStatus,
  )
}
