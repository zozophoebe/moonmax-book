import type { DepositAddress } from '../../types/ledger'

// Demo addresses only — not real wallets. Never send funds to these.
export const mockDepositAddresses: DepositAddress[] = [
  { chain: 'solana', token: 'USDC', address: '7mQx2RkT9vWcN4pHyE6sJbL8aFd3GuZqK5tVn1XrYoAe', addedAt: '2026-01-06T03:10:00Z' },
  { chain: 'base', token: 'USDC', address: '0x5C3a9E1f7B24d86A0c4F2e9D1b7083Ac6F5e2B94', addedAt: '2026-02-11T08:42:00Z' },
]
