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

export function extraText(t: T, kind: import('../types/max').ExtraKind): { label: string; hint: string } {
  switch (kind) {
    case 'other-asset':
      return { label: t('額外轉入：不是 MoonPay 收入的幣', 'Extra: not a MoonPay coin'), hint: t('這筆是你另外轉進 MAX 的幣（例如 SOL），不是 MoonPay 收到的錢，不算進收入對帳。', 'Coins you sent to MAX yourself (e.g. SOL) — not MoonPay income, so not part of the income match.') }
    case 'other-wallet':
      return { label: t('額外轉入：不是從收款錢包', 'Extra: not from a receiving wallet'), hint: t('這筆不是從你的收款錢包轉來的，所以不會對到 MoonPay 收入。', 'This didn’t come from one of your receiving wallets, so it isn’t matched to MoonPay income.') }
    case 'not-found':
      return { label: t('額外轉入：鏈上查不到', 'Extra: not found on chain'), hint: t('用 MAX 給的交易編號在 Solana 上查不到這筆，可能是別條鏈的入金。', 'MAX’s transaction ID wasn’t found on Solana — maybe a deposit on another chain.') }
    case 'beyond-income':
      return { label: t('額外轉入：比 MoonPay 收入多', 'Extra: more than MoonPay income'), hint: t('這筆轉進 MAX 的 USDC 比你到目前為止的 MoonPay 收入還多，多出來的部分是你自己的錢。', 'You sent more USDC to MAX than your MoonPay income so far; the excess is your own money.') }
  }
}

export const signedTwd = (v: string) => (v.startsWith('-') ? `−NT$${v.slice(1)}` : v === '0.00' ? 'NT$0.00' : `+NT$${v}`)
