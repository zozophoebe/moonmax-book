import type { ReactNode } from 'react'
import { ArrowUpRight, BookOpen, Building2, Coins, Database, FileCode2, FileLock2, ShieldAlert } from 'lucide-react'
import { Eyebrow } from '../atoms'
import { isDeployed } from '../../lib/runtime'
import { useT } from '../../i18n'

const page = (hash: string) => `${window.location.search}${hash}`

function SideCard({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <section className="animate-rise rounded-xl border border-border bg-card px-5 py-5 shadow-sheet" style={{ animationDelay: `${delay}ms` }}>
      {children}
    </section>
  )
}

export function WhereThingsAre() {
  const t = useT()
  const links = [
    { href: 'https://moonpay.hel.io', title: t('MoonPay Commerce 後台', 'MoonPay Commerce dashboard'), hint: t('Payments、Developer → Endpoints（webhook）都在這裡', 'Payments and Developer → Endpoints (webhook) live here'), Icon: Coins },
    { href: 'https://docs.hel.io/docs/for-creators', title: t('MoonPay Commerce 官方文件', 'MoonPay Commerce docs'), hint: t('付款連結、費用、Webhook', 'Payment links, fees, webhooks'), Icon: FileCode2 },
    { href: 'https://max.maicoin.com/', title: t('MAX 交易所', 'MAX exchange'), hint: t('錢包 → USDC → 入金（選 Solana）', 'Wallet → USDC → Deposit (pick Solana)'), Icon: Building2 },
  ]
  return (
    <SideCard delay={40}>
      <Eyebrow>{t('你會用到的地方', 'Where you’ll go')}</Eyebrow>
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
  const t = useT()
  const rows = [
    [t('MoonPay 交易手續費', 'MoonPay transaction fee'), t('2%（HelioX 1%）', '2% (HelioX 1%)')],
    [t('買家用其他幣付款', 'Buyer pays in another coin'), '+0.25%'],
    [t('MAX 交易手續費', 'MAX trading fee'), '0.08–0.16%'],
  ]
  return (
    <SideCard delay={80}>
      <Eyebrow>{t('大概會被收多少', 'Roughly what it costs')}</Eyebrow>
      <dl className="mt-3 divide-y divide-border text-[13px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 py-2">
            <dt className="text-fg-2">{k}</dt>
            <dd className="num text-fg">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[12px] leading-[1.65] text-fg-3">{t('MAX 費率為第三方整理。全部以官方最新公告為準。', 'MAX rates are from a third-party summary. Official announcements always win.')}</p>
    </SideCard>
  )
}

export function PrivacyCard() {
  const t = useT()
  const deployed = isDeployed()
  const rows = deployed
    ? [
        { Icon: FileCode2, file: t('設定', 'Settings'), body: t('Pay Link ID、網站網址、MAX 地址。都是公開資訊，存在這個網站專用的私人 Vercel Blob，每個帳號分開存放。', 'Pay Link IDs, site addresses, MAX address — all public information, kept in this site’s private Vercel Blob store, separately for each account.') },
        { Icon: FileLock2, file: 'Webhook Secret', body: t('同一個私人 Blob，只有這個網站的伺服器讀得到，畫面只顯示最後 4 碼。', 'Same private store; only this site’s server can read it, and the page shows just the last 4 characters.') },
        { Icon: Database, file: t('MoonPay 通知', 'MoonPay notifications'), body: t('只留金額、時間、交易編號和 Pay Link，買家個資收到就丟。', 'Only amount, time, transaction ID and Pay Link are kept; buyer details are thrown away on arrival.') },
        { Icon: Database, file: t('MAX 紀錄', 'MAX records'), body: t('匯入的 CSV 只留日期、幣別、金額、交易編號和狀態，可以隨時清除。', 'Imported CSVs keep only date, coin, amount, transaction ID and status; clear them any time.') },
        { Icon: FileLock2, file: t('登入', 'Sign-in'), body: t('用 Google 登入，每個 Google 帳號只看得到自己的帳本。Google 金鑰放在 Vercel 的環境變數，網站上看不到。', 'Sign in with Google; each Google account sees only its own ledger. The Google keys sit in Vercel environment variables, never on the page.') },
      ]
    : [
        { Icon: FileCode2, file: 'platform.config.json', body: t('Pay Link ID、網站網址、MAX 地址。都是公開資訊。', 'Pay Link IDs, site addresses, MAX address — all public information.') },
        { Icon: FileLock2, file: 'data/webhook.local.json', body: t('Webhook Secret。只在你電腦上，畫面只顯示最後 4 碼。', 'The webhook Secret. Only on your computer; the page shows its last 4 characters.') },
        { Icon: Database, file: 'data/*.json', body: t('區塊鏈讀取快取、MoonPay 通知和匯入的 MAX 紀錄。通知只留金額、時間、交易編號和 Pay Link，買家個資收到就丟。', 'Blockchain read cache, MoonPay notifications and imported MAX records. Only amount, time, transaction ID and Pay Link are kept from notifications; buyer details are thrown away.') },
      ]
  return (
    <SideCard delay={120}>
      <Eyebrow>{t('你的資料放在哪', 'Where your data lives')}</Eyebrow>
      <ul className="mt-3 space-y-3 text-[13px] leading-[1.65]">
        {rows.map(({ Icon, file, body }) => (
          <li key={file} className="flex gap-2.5">
            <Icon className="mt-[3px] size-4 shrink-0 text-fg-3" aria-hidden />
            <span>
              <span className={`text-[12px] text-fg ${deployed ? 'font-medium' : 'font-mono'}`}>{file}</span>
              <span className="block text-fg-3">{body}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-border pt-3 text-[12.5px] leading-[1.65] text-fg-3">
        {t('沒有任何 MoonPay API 金鑰或 MAX 帳密。', 'No MoonPay API keys or MAX credentials anywhere.')}{' '}
        <a href="/privacy.html" className="focus-ring rounded font-medium text-fg-2 underline decoration-primary decoration-2 underline-offset-[3px] hover:text-fg">
          {t('隱私權政策', 'Privacy policy')}
        </a>
      </p>
    </SideCard>
  )
}

// How a MoonPay Commerce account is organised, and which part MoonMax Book reads.
export function MoonPayMapCard() {
  const t = useT()
  const rows: { depth: number; title: string; body: string; tag?: string }[] = [
    { depth: 0, title: t('你的 MoonPay Commerce 帳號', 'Your MoonPay Commerce account'), body: t('一個商家帳號，底下可以有很多 Pay Link。', 'One merchant account, with as many Pay Links as you like.') },
    { depth: 1, title: t('收款錢包', 'Receiving wallets'), body: t('每條鏈各設一個，例如 Solana、Base。錢直接進這裡，MoonPay 不保管。', 'One per chain, e.g. Solana and Base. Money lands here directly; MoonPay never holds it.'), tag: t('從鏈上讀', 'read from chain') },
    { depth: 1, title: 'Pay Links', body: t('每個商品或網站一個。各自有名稱、價格，指定錢要進哪個錢包。', 'One per product or site, each with a name, a price and the wallet it pays into.'), tag: t('你貼 ID', 'you paste the ID') },
    { depth: 2, title: t('交易', 'Transactions'), body: t('每筆付款都記得是哪個 Pay Link 付的。後台可以看、可以匯出 CSV。', 'Every payment knows which Pay Link it came through. Viewable and exportable as CSV in the dashboard.') },
    { depth: 1, title: t('Webhook（Developer → Endpoints）', 'Webhook (Developer → Endpoints)'), body: t('加一個 Endpoint、選 All Pay Links，所有 Pay Link 的付款都會通知過來。', 'Add one Endpoint for All Pay Links and every payment is reported.'), tag: t('分出網站', 'tells sites apart') },
  ]
  return (
    <SideCard delay={0}>
      <Eyebrow>{t('MoonPay 是怎麼排的', 'How MoonPay is organised')}</Eyebrow>
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
        {t('MoonPay 設定教學', 'MoonPay setup guide')}
      </a>
    </SideCard>
  )
}

export function DontsCard() {
  const t = useT()
  const items = [
    t('轉帳選錯網路，資產救不回來', 'Sending on the wrong network — the funds are gone for good'),
    t('透過幣安、OKX 出金再匯回台灣，容易被銀行凍結', 'Cashing out via Binance or OKX and wiring home — banks often freeze it'),
    t('把金額拆成小於 50 萬分次提領；50 萬是申報門檻，不是免稅額', 'Splitting withdrawals under NT$500k — that’s a reporting threshold, not a tax-free allowance'),
  ]
  return (
    <SideCard delay={160}>
      <p className="flex items-center gap-1.5 text-[12px] font-medium tracking-[0.06em] text-danger-deep">
        <ShieldAlert className="size-4" aria-hidden />
        {t('千萬不要', 'Never')}
      </p>
      <ul className="mt-2.5 space-y-2 text-[13px] leading-[1.65] text-fg-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden className="mt-[9px] size-1 shrink-0 rounded-full bg-danger" />
            {item}
          </li>
        ))}
      </ul>
      <a href={page('#/docs/cashout')} className="focus-ring mt-3 inline-flex items-center gap-1 rounded text-[13px] font-medium text-fg underline decoration-primary decoration-2 underline-offset-[3px] hover:decoration-fg">
        <BookOpen className="size-3.5" aria-hidden />
        {t('出金教學', 'Cash-out guide')}
      </a>
    </SideCard>
  )
}
