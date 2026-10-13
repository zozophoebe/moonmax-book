import type { Chain } from '../types/ledger'

// Display-only formatting. Amounts arrive as decimal strings and are never
// converted to JS numbers here, so nothing can drift (FRONTEND_FIRST.md §6.1).

const MINUS = '−'

function splitSign(value: string): { negative: boolean; digits: string } {
  const trimmed = value.trim()
  if (trimmed.startsWith('-')) return { negative: true, digits: trimmed.slice(1) }
  if (trimmed.startsWith('+')) return { negative: false, digits: trimmed.slice(1) }
  return { negative: false, digits: trimmed }
}

function groupThousands(digits: string): string {
  const [int = '0', frac] = digits.split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return frac === undefined ? grouped : `${grouped}.${frac}`
}

export function isZero(value: string): boolean {
  return /^[-+]?0*(\.0*)?$/.test(value.trim())
}

export function isNegative(value: string): boolean {
  return splitSign(value).negative && !isZero(value)
}

export function formatTwd(value: string, opts: { signed?: boolean } = {}): string {
  const { negative, digits } = splitSign(value)
  const body = `NT$${groupThousands(digits)}`
  if (isZero(value)) return body
  if (negative) return `${MINUS}${body}`
  return opts.signed ? `+${body}` : body
}

export function formatTwdParts(value: string): { sign: string; prefix: string; amount: string } {
  const { negative, digits } = splitSign(value)
  return { sign: negative && !isZero(value) ? MINUS : '', prefix: 'NT$', amount: groupThousands(digits) }
}

export function formatTokenAmount(value: string): string {
  const { negative, digits } = splitSign(value)
  return `${negative ? MINUS : ''}${groupThousands(digits)}`
}

export const CHAIN_LABEL: Record<Chain, string> = { solana: 'Solana', base: 'Base' }

const dateFmt = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const timeFmt = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function parts(fmt: Intl.DateTimeFormat, iso: string) {
  const out: Record<string, string> = {}
  for (const p of fmt.formatToParts(new Date(iso))) out[p.type] = p.value
  return out
}

export function formatDate(iso: string): string {
  const p = parts(dateFmt, iso)
  return `${p.year}/${p.month}/${p.day}`
}

export function formatMonthDay(iso: string): string {
  const p = parts(dateFmt, iso)
  return `${p.month}/${p.day}`
}

export function formatTime(iso: string): string {
  const p = parts(timeFmt, iso)
  return `${p.hour}:${p.minute}`
}

export function formatDateTime(iso: string): string {
  return `${formatMonthDay(iso)} ${formatTime(iso)}`
}
