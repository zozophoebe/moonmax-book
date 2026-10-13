import type { ReactNode } from 'react'
import { ArrowUpRight, BookOpen, Building2, Coins, Database, FileCode2, FileLock2, FlaskConical, ShieldAlert } from 'lucide-react'
import { Eyebrow } from '../atoms'

const page = (hash: string) => `${window.location.search}${hash}`

function SideCard({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <section className="animate-rise rounded-xl border border-border bg-card px-5 py-5 shadow-sheet" style={{ animationDelay: `${delay}ms` }}>
      {children}
    </section>
  )
}

export function WhereThingsAre() {
  const links = [
    { href: 'https://moonpay.hel.io', title: 'MoonPay Commerce 後台', hint: 'Pay Links、Developer → Endpoints（webhook）都在這裡', Icon: Coins },
    { href: 'https://docs.hel.io/docs/for-creators', title: 'MoonPay Commerce 官方文件', hint: '付款連結、費用、Webhook', Icon: FileCode2 },
    { href: 'https://max.maicoin.com/', title: 'MAX 交易所', hint: '錢包 → USDC → 入金（選 Solana）', Icon: Building2 },
  ]
  return (
    <SideCard delay={40}>
      <Eyebrow>你會用到的地方</Eyebrow>
      <ul className="mt-3 space-y-1">
        {links.map(({ href, title, hint, Icon }) => (
          <li key={href}>
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="focus-ring group -mx-2 flex items-start gap-3 rounded-lg px-2 py-2 transition-transform duration-150 hover:bg-muted active:scale-[0.99]"
            >
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-background text-fg-2">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-[13.5px] font-medium text-fg">
                  {title}
                  <ArrowUpRight className="size-3.5 text-fg-3" aria-hidden />
                </span>
                <span className="block text-[12.5px] text-fg-3">{hint}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </SideCard>
  )
}

export function FeesCard() {
  const rows = [
    ['MoonPay 交易手續費', '2%（HelioX 1%）'],
    ['買家用其他幣付款', '+0.25%'],
    ['MAX 交易手續費', '0.08–0.16%'],
  ]
  return (
    <SideCard delay={80}>
      <Eyebrow>大概會被收多少</Eyebrow>
      <dl className="mt-3 divide-y divide-border text-[13px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 py-2">
            <dt className="text-fg-2">{k}</dt>
            <dd className="num text-fg">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[12px] leading-[1.65] text-fg-3">MAX 費率為第三方整理。全部以官方最新公告為準。</p>
    </SideCard>
  )
}

export function PrivacyCard() {
  const rows = [
    { Icon: FileCode2, file: 'platform.config.json', body: 'Pay Link ID、網站網址、MAX 地址。都是公開資訊。' },
    { Icon: FileLock2, file: 'data/webhook.local.json', body: 'Webhook 驗證碼。只在你電腦上，畫面只顯示最後 4 碼。' },
    { Icon: Database, file: 'data/*.json', body: '區塊鏈讀取快取和 MoonPay 通知。通知只留金額、時間、交易編號和 Pay Link，買家個資收到就丟。' },
  ]
  return (
    <SideCard delay={120}>
      <Eyebrow>你的資料放在哪</Eyebrow>
      <ul className="mt-3 space-y-3 text-[13px] leading-[1.65]">
        {rows.map(({ Icon, file, body }) => (
          <li key={file} className="flex gap-2.5">
            <Icon className="mt-[3px] size-4 shrink-0 text-fg-3" aria-hidden />
            <span>
              <span className="font-mono text-[12px] text-fg">{file}</span>
              <span className="block text-fg-3">{body}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-border pt-3 text-[12.5px] leading-[1.65] text-fg-3">沒有任何 MoonPay API 金鑰或 MAX 帳密。</p>
    </SideCard>
  )
}

// How a MoonPay Commerce account is organised, and which part MoonMax Book reads.
export function MoonPayMapCard() {
  const rows: { depth: number; title: string; body: string; tag?: string }[] = [
    { depth: 0, title: '你的 MoonPay Commerce 帳號', body: '一個商家帳號，底下可以有很多 Pay Link。' },
    { depth: 1, title: '收款錢包', body: '每條鏈各設一個，例如 Solana、Base。錢直接進這裡，MoonPay 不保管。', tag: '從鏈上讀' },
    { depth: 1, title: 'Pay Links', body: '每個商品或網站一個。各自有名稱、價格，指定錢要進哪個錢包。', tag: '你貼 ID' },
    { depth: 2, title: '交易', body: '每筆付款都記得是哪個 Pay Link 付的。後台可以看、可以匯出 CSV。' },
    { depth: 1, title: 'Webhook（Developer → Endpoints）', body: '加一個 Endpoint、選 All Pay Links，所有 Pay Link 的付款都會通知過來。', tag: '分出網站' },
  ]
  return (
    <SideCard delay={0}>
      <Eyebrow>MoonPay 是怎麼排的</Eyebrow>
      <ol className="mt-3 space-y-2.5">
        {rows.map((r) => (
          <li key={r.title} className="relative" style={{ paddingLeft: `${r.depth * 16}px` }}>
            <div className={`border-l-2 pl-3 ${r.depth === 0 ? 'border-fg' : 'border-border-strong'}`}>
              <p className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-medium text-fg">
                {r.title}
                {r.tag ? <span className="rounded-md border border-primary-ink/15 bg-primary-soft px-1.5 text-[11px] font-normal leading-[18px] text-primary-ink">{r.tag}</span> : null}
              </p>
              <p className="text-[12.5px] leading-[1.6] text-fg-3">{r.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <a href={page('#/docs/moonpay')} className="focus-ring mt-3 inline-flex items-center gap-1 rounded text-[13px] font-medium text-fg underline decoration-primary decoration-2 underline-offset-[3px] hover:decoration-fg">
        <BookOpen className="size-3.5" aria-hidden />
        MoonPay 設定教學
      </a>
    </SideCard>
  )
}

export function DontsCard() {
  const items = ['轉帳選錯網路，資產救不回來', '透過幣安、OKX 出金再匯回台灣，容易被銀行凍結', '把金額拆成小於 50 萬分次提領；50 萬是申報門檻，不是免稅額']
  return (
    <SideCard delay={160}>
      <p className="flex items-center gap-1.5 text-[12px] font-medium tracking-[0.06em] text-danger-deep">
        <ShieldAlert className="size-4" aria-hidden />
        千萬不要
      </p>
      <ul className="mt-2.5 space-y-2 text-[13px] leading-[1.65] text-fg-2">
        {items.map((t) => (
          <li key={t} className="flex gap-2">
            <span aria-hidden className="mt-[9px] size-1 shrink-0 rounded-full bg-danger" />
            {t}
          </li>
        ))}
      </ul>
      <a href={page('#/docs/cashout')} className="focus-ring mt-3 inline-flex items-center gap-1 rounded text-[13px] font-medium text-fg underline decoration-primary decoration-2 underline-offset-[3px] hover:decoration-fg">
        <BookOpen className="size-3.5" aria-hidden />
        出金教學
      </a>
    </SideCard>
  )
}

export function DemoCard() {
  return (
    <SideCard delay={200}>
      <p className="flex items-center gap-1.5 text-[12px] font-medium tracking-[0.06em] text-fg-3">
        <FlaskConical className="size-4" aria-hidden />
        先看看接好之後的樣子
      </p>
      <p className="mt-2 text-[13px] leading-[1.65] text-fg-2">示範帳本用假資料，展示一整年的收款、出金、FIFO 對帳和匯出。</p>
      <a
        href="/demo/"
        className="focus-ring mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[13px] font-medium shadow-sheet transition-transform duration-150 hover:bg-muted active:scale-[0.97]"
      >
        打開示範帳本
        <ArrowUpRight className="size-3.5" aria-hidden />
      </a>
    </SideCard>
  )
}
