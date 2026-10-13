// Contract for the real-platform check (served by server/platformApi.ts in dev).
// Amounts are decimal strings, same rule as types/ledger.ts.

export type CheckStatus = 'ok' | 'warn' | 'fail' | 'info'

export type CheckGroup = 'paylink' | 'site' | 'data' | 'account' | 'cashout'

export type CheckFact = { label: string; value: string; mono?: boolean }

export type PlatformCheck = {
  id: string
  group: CheckGroup
  status: CheckStatus
  title: string
  detail: string
  fix?: string
  docHref?: string
  facts?: CheckFact[]
}

export type PlatformPaylink = {
  id: string
  label: string
  name: string
  hostedUrl: string
  siteUrl: string | null
  priceToken: string
  token: string
  active: boolean
  netPerSaleToken: string
}

export type PlatformStatus = {
  checkedAt: string
  paylinks: PlatformPaylink[]
  fees: {
    standardPct: string
    helioXPct: string
    swapPct: string
    offrampPct: string
    source: string
    asOf: string
  }
  checks: PlatformCheck[]
  counts: Record<CheckStatus, number>
}
