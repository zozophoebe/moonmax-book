// Decimal helpers on BigInt minor units. Money never goes through a JS float.

export function toUnits(decimal: string, decimals: number): bigint {
  const [int = '0', frac = ''] = decimal.replace(/,/g, '').trim().split('.')
  const padded = (frac + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(int || '0') * 10n ** BigInt(decimals) + BigInt(padded || '0')
}

// Rounds half up to `dp` places.
export function unitsToDecimal(units: bigint, decimals: number, dp = 2): string {
  if (dp >= decimals) {
    const s = units.toString().padStart(decimals + 1, '0')
    const out = decimals === 0 ? s : `${s.slice(0, -decimals)}.${s.slice(-decimals)}`
    return dp > decimals ? out + '0'.repeat(dp - decimals) : out
  }
  const scale = 10n ** BigInt(decimals - dp)
  const s = ((units + scale / 2n) / scale).toString().padStart(dp + 1, '0')
  return dp === 0 ? s : `${s.slice(0, -dp)}.${s.slice(-dp)}`
}

export const bpsPct = (bps: bigint) => unitsToDecimal(bps, 2, bps % 100n === 0n ? 0 : 2)

// Trims trailing zeros but keeps at least `min` decimal places: 1.957770 → 1.95777, 2.000000 → 2.00.
export function tokenString(units: bigint, decimals: number, min = 2): string {
  const full = unitsToDecimal(units, decimals, decimals)
  const [int = '0', frac = ''] = full.split('.')
  const trimmed = frac.replace(/0+$/, '')
  return `${int}.${trimmed.padEnd(min, '0')}`
}
