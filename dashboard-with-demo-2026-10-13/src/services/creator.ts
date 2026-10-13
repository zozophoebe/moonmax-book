import type { Creator } from '../types/ledger'
import { mockCreator } from '../demo/mocks/creator'
import { simulate } from '../demo/sim'
import { getJson } from './http'
import { isDemo } from './mode'

export async function getCreator(): Promise<Creator> {
  if (!isDemo()) return getJson<Creator>('/api/real/creator')
  return simulate({ source: 'account', failsOnError: false }, () => mockCreator)
}
