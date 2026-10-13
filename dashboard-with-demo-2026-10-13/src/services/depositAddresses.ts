import type { DepositAddress } from '../types/ledger'
import { mockDepositAddresses } from '../demo/mocks/depositAddresses'
import { simulate } from '../demo/sim'
import { getJson } from './http'
import { isDemo } from './mode'

export async function getDepositAddresses(_creatorId: string): Promise<DepositAddress[]> {
  if (!isDemo()) return getJson<DepositAddress[]>('/api/real/deposit-addresses')
  return simulate({ source: 'account', failsOnError: false }, (scenario) => (scenario === 'empty' ? [] : mockDepositAddresses))
}
