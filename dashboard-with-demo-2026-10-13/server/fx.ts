// USD→TWD on the receipt's date (Asia/Taipei). Interim source: currency-api's daily
// reference rates (free, no key). The Central Bank's open API stops in 2012 and
// Bank of Taiwan's CSV sits behind a bot check — which official source to use is
// still an open decision (SPEC.md §9).

import { fetchWithTimeout } from './http'
import { loadCache, saveCache } from './store'

export const FX_SOURCE = 'currency-api 每日參考匯率（暫用，之後換成台灣官方來源）'
const RATE_DP = 4

type FxCache = Record<string, string> // YYYY-MM-DD (Taipei) → TWD per USD, 4 dp

const taipeiDate = (iso: string, minusDays = 0) => new Date(Date.parse(iso) + 8 * 3600_000 - minusDays * 86_400_000).toISOString().slice(0, 10)

async function fetchRate(date: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/usd.min.json`, {}, 8_000)
    if (!res.ok) return null
    const body = (await res.json()) as { usd?: { twd?: number } }
    // The API returns a float; it is a rate, not money, and is fixed to 4 dp right here.
    return typeof body.usd?.twd === 'number' ? body.usd.twd.toFixed(RATE_DP) : null
  } catch {
    return null
  }
}

export async function ratesFor(root: string, isoTimes: string[]): Promise<Map<string, string | null>> {
  const cache = await loadCache<FxCache>(root, 'fx', {})
  let changed = false
  const out = new Map<string, string | null>()
  for (const iso of isoTimes) {
    const day = taipeiDate(iso)
    if (!(day in cache)) {
      // Today's file may not be published yet: fall back up to 3 days.
      let rate: string | null = null
      for (let back = 0; back < 4 && !rate; back++) rate = await fetchRate(taipeiDate(iso, back))
      if (rate) {
        cache[day] = rate
        changed = true
      }
    }
    out.set(iso, cache[day] ?? null)
  }
  if (changed) await saveCache(root, 'fx', cache)
  return out
}

// gross (token minor units, USDC treated as 1 USD) × rate → whole NT$, rounded half up.
export function twdValue(grossUnits: bigint, tokenDecimals: number, rate: string): string {
  const [int = '0', frac = ''] = rate.split('.')
  const rateScaled = BigInt(int + frac.padEnd(RATE_DP, '0').slice(0, RATE_DP))
  const scale = 10n ** BigInt(tokenDecimals + RATE_DP)
  return ((grossUnits * rateScaled + scale / 2n) / scale).toString()
}
