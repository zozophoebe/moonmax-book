// Non-secret settings. Everything here is public information (Pay Link IDs, site URLs,
// deposit addresses). The webhook Secret is stored separately (see store.ts).

import type { DepositAddress } from '../src/types/ledger'
import type { Storage } from './storage'

// One Pay Link per site or product, so payments can be told apart.
export type PaylinkSource = {
  id: string
  label: string | null
  siteUrl: string | null
  addedAt: string
}

export type PlatformConfig = {
  paylinks: PaylinkSource[]
  maxDepositAddresses: DepositAddress[]
}

// v1 stored a single paylinkId + siteUrl.
type LegacyConfig = { paylinkId?: string | null; siteUrl?: string | null }

export async function loadConfig(storage: Storage): Promise<PlatformConfig> {
  const raw = await storage.get<Partial<PlatformConfig> & LegacyConfig>('config')
  if (!raw) return { paylinks: [], maxDepositAddresses: [] }
  const paylinks = raw.paylinks ?? (raw.paylinkId ? [{ id: raw.paylinkId, label: null, siteUrl: raw.siteUrl ?? null, addedAt: new Date().toISOString() }] : [])
  return { paylinks, maxDepositAddresses: raw.maxDepositAddresses ?? [] }
}

export async function saveConfig(storage: Storage, config: PlatformConfig): Promise<void> {
  await storage.set('config', { paylinks: config.paylinks, maxDepositAddresses: config.maxDepositAddresses } satisfies PlatformConfig)
}

// Accepts a bare ID or any MoonPay Commerce URL that contains one.
export function parsePaylinkId(input: string): string | null {
  return input.trim().match(/\b([a-f0-9]{24})\b/i)?.[1]?.toLowerCase() ?? null
}

// Solana addresses are base58 (no 0, O, I, l), 32–44 characters.
export function isSolanaAddress(input: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input.trim())
}

export function normalizeUrl(input: string): string | null {
  try {
    const url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`)
    return url.protocol === 'https:' || url.hostname === 'localhost' ? url.toString().replace(/\/$/, '') : null
  } catch {
    return null
  }
}

export function cleanLabel(input: unknown): string | null {
  const s = typeof input === 'string' ? input.trim().slice(0, 40) : ''
  return s || null
}
