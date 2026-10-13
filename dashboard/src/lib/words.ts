// Wording for structured values the server sends (it sends data, not sentences).
import type { T } from '../i18n'
import type { ReceiptSource } from '../types/receipts'
import type { WalletLimit } from '../types/setup'

export function walletLimitText(t: T, limit: WalletLimit, chain: string): string | null {
  if (!limit) return null
  if (limit.kind === 'token') return t(`目前只讀 USDC 和 USDT，這個錢包收的是 ${limit.token}。`, `Only USDC and USDT are read for now; this wallet receives ${limit.token}.`)
  return t(
    `${chain} 的公開節點不提供歷史紀錄查詢，這條鏈的收款先靠 MoonPay 的通知（webhook）記錄。`,
    `${chain}’s public node doesn’t serve transaction history, so payments on this chain are recorded from MoonPay’s notifications (webhook) for now.`,
  )
}

export function sourceLabel(t: T, s: Pick<ReceiptSource, 'key' | 'kind' | 'label' | 'registered'>): string {
  if (s.kind === 'unmatched') return t('分不出是哪個 Pay Link', 'Pay Link unknown')
  if (s.kind === 'other') return t('其他轉入', 'Other transfers in')
  if (!s.registered) return t(`還沒加入的 Pay Link ${s.key.slice(0, 6)}…`, `Pay Link not added yet ${s.key.slice(0, 6)}…`)
  return s.label ?? `Pay Link ${s.key.slice(0, 6)}…`
}

export const fxSourceText = (t: T) =>
  t('currency-api 每日參考匯率（暫用，之後換成台灣官方來源）', 'currency-api daily reference rate (interim — to be replaced by an official Taiwanese source)')
