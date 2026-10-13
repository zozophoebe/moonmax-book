import type { ComponentType } from 'react'
import { Building2, Coins, UserRoundCheck, type LucideIcon } from 'lucide-react'
import type { DocSlug } from '../../app/router'
import { CashoutEn, CashoutZh } from './cashout'
import { MoonpayEn, MoonpayZh } from './moonpay'
import { WhoEn, WhoZh } from './who'

export const DOCS_UPDATED = '2026-10-13'

type Bi = { zh: string; en: string }

export type DocMeta = {
  slug: DocSlug
  Icon: LucideIcon
  title: Bi
  summary: Bi
  minutes: number
  body: { zh: ComponentType; en: ComponentType }
}

export const DOCS: DocMeta[] = [
  {
    slug: 'who',
    Icon: UserRoundCheck,
    title: { zh: '誰適合用這個流程', en: 'Who this is for' },
    summary: {
      zh: '沒有公司行號、沒有國外帳戶，想試著把東西賣到國外：用我自己的 Figma 外掛當例子，走一遍整個流程。',
      en: 'No company, no foreign bank account, and something to sell abroad — the whole flow, walked through with my own Figma plugin.',
    },
    minutes: 6,
    body: { zh: WhoZh, en: WhoEn },
  },
  {
    slug: 'moonpay',
    Icon: Coins,
    title: { zh: 'MoonPay Commerce 帳號與設定', en: 'Setting up MoonPay Commerce' },
    summary: {
      zh: 'MoonPay 是怎麼排的、從註冊到放上網站，以及設定通知（webhook）。',
      en: 'How MoonPay is organised, from sign-up to your site, plus notifications (webhook).',
    },
    minutes: 8,
    body: { zh: MoonpayZh, en: MoonpayEn },
  },
  {
    slug: 'cashout',
    Icon: Building2,
    title: { zh: '出金教學：從 USDC 到台灣銀行帳戶', en: 'Cashing out: from USDC to your Taiwan bank' },
    summary: {
      zh: '把收到的 USDC 轉到 MAX、賣成台幣、提領到自己的帳戶。',
      en: 'Send your USDC to MAX, sell it for TWD and withdraw to your own account.',
    },
    minutes: 6,
    body: { zh: CashoutZh, en: CashoutEn },
  },
]
