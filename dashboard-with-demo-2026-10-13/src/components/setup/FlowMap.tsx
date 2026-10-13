import { ArrowRight, Building2, Coins, Landmark, ShoppingBag } from 'lucide-react'
import type { SetupState } from '../../types/setup'
import { LogoMark } from '../Logo'

type NodeStatus = { label: string; tone: 'ok' | 'warn' | 'idle' }

function chip({ label, tone }: NodeStatus) {
  const cls =
    tone === 'ok' ? 'border-success/20 bg-success-soft text-success' : tone === 'warn' ? 'border-warn/25 bg-warn-soft text-warn' : 'border-border bg-muted text-fg-3'
  return <span className={`inline-flex rounded-md border px-1.5 text-[11.5px] leading-5 ${cls}`}>{label}</span>
}

export function FlowMap({ setup }: { setup: SetupState | null }) {
  const live = setup?.paylinks.filter((p) => p.preview) ?? []
  const hasMax = Boolean(setup?.maxDepositAddresses.some((a) => a.chain === 'solana'))
  const webhook = setup?.webhook.configured ?? false
  const nodes: { title: string; body: string; Icon: typeof Coins; status: NodeStatus }[] = [
    {
      title: '買家付款',
      body: '在你的網站按購買，用 USDC 或其他幣付款。',
      Icon: ShoppingBag,
      status: live.length ? { label: `${live.length} 個 Pay Link 在收款`, tone: 'idle' } : { label: '等你加入 Pay Link', tone: 'idle' },
    },
    {
      title: 'MoonPay Commerce',
      body: '收款，錢直接進你設定的錢包，同時可以通知 MoonMax Book。',
      Icon: Coins,
      status: !live.length ? { label: '尚未連結', tone: 'warn' } : webhook ? { label: '已連結 · 通知已設定', tone: 'ok' } : { label: '已連結 · 還沒設通知', tone: 'ok' },
    },
    {
      title: 'MAX 交易所',
      body: '把 Solana 上的 USDC 轉進來，賣成新台幣。',
      Icon: Building2,
      status: hasMax ? { label: '入金地址已設定', tone: 'ok' } : { label: '尚未設定地址', tone: 'warn' },
    },
    {
      title: '你的銀行帳戶',
      body: '新台幣提領到你本人名下的帳戶。',
      Icon: Landmark,
      status: { label: '在 MAX 綁定', tone: 'idle' },
    },
  ]

  return (
    <div className="animate-rise rounded-xl border border-border bg-card p-5 shadow-sheet md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold">錢會怎麼走</h2>
        <p className="text-[12.5px] text-fg-3">MoonMax Book 不碰錢，也不需要你的 API 金鑰</p>
      </div>

      <ol className="mt-4 grid gap-2 md:grid-cols-4 md:gap-0">
        {nodes.map(({ title, body, Icon, status }, i) => (
          <li key={title} className="relative md:pr-6">
            <div className="flex h-full items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 md:flex-col md:items-start md:gap-0 md:p-3.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-card text-fg-2">
                <Icon className="size-4" aria-hidden />
              </span>
              <p className="min-w-0 flex-1 text-[14px] font-semibold md:mt-2.5 md:flex-none">{title}</p>
              <p className="mt-0.5 hidden flex-1 text-[12.5px] leading-[1.6] text-fg-3 md:block">{body}</p>
              <div className="shrink-0 md:mt-2.5">{chip(status)}</div>
            </div>
            {i < nodes.length - 1 ? (
              <ArrowRight className="absolute right-1 top-1/2 hidden size-4 -translate-y-1/2 text-fg-3 md:block" aria-hidden />
            ) : null}
          </li>
        ))}
      </ol>

      <div className="mt-3 flex items-start gap-3 rounded-lg border border-dashed border-border-strong px-3.5 py-3 md:mx-[12.5%] md:items-center">
        <LogoMark size={28} />
        <p className="text-[13px] leading-[1.65] text-fg-2">
          <span className="font-medium text-fg">MoonMax Book 在中間做的事：</span>
          從公開的區塊鏈讀每筆收款 → 用 MoonPay 的通知分出是哪個網站 → 記下收到當下的台幣價值 → 出金時用先進先出法算賺賠 → 年底匯出給會計師。
        </p>
      </div>
    </div>
  )
}
