// Local, non-secret settings for the real platform. Everything here is public information
// (Pay Link IDs, site URLs, deposit addresses). The webhook token lives in data/ (see store.ts).

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { DepositAddress } from '../src/types/ledger'

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

export const EMPTY_CONFIG: PlatformConfig = { paylinks: [], maxDepositAddresses: [] }

const FILE = 'platform.config.json'

// v1 stored a single paylinkId + siteUrl.
type LegacyConfig = { paylinkId?: string | null; siteUrl?: string | null }

export async function loadConfig(root: string): Promise<PlatformConfig> {
  let raw: Partial<PlatformConfig> & LegacyConfig
  try {
    raw = JSON.parse(await readFile(path.join(root, FILE), 'utf8')) as Partial<PlatformConfig> & LegacyConfig
  } catch {
    return { paylinks: [], maxDepositAddresses: [] }
  }
  const paylinks = raw.paylinks ?? (raw.paylinkId ? [{ id: raw.paylinkId, label: null, siteUrl: raw.siteUrl ?? null, addedAt: new Date().toISOString() }] : [])
  return { paylinks, maxDepositAddresses: raw.maxDepositAddresses ?? [] }
}

export async function saveConfig(root: string, config: PlatformConfig): Promise<void> {
  const out: PlatformConfig = { paylinks: config.paylinks, maxDepositAddresses: config.maxDepositAddresses }
  await writeFile(path.join(root, FILE), `${JSON.stringify(out, null, 2)}\n`, 'utf8')
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
