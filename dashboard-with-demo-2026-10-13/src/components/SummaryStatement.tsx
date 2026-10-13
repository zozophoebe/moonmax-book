import { ArrowUpRight, Link2, Upload } from 'lucide-react'
import type { AnnualSummary } from '../types/ledger'
import { formatDateTime, formatTokenAmount, formatTwdParts } from '../lib/format'
import { Button, ChainBadge, Eyebrow, Money, SkeletonBar } from './atoms'

export function SummaryStatement({ summary }: { summary: AnnualSummary }) {
  return (
    <div className="px-6 pb-6 pt-6 md:px-8 md:pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Eyebrow>年度對帳摘要</Eyebrow>
          <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.03em]">{summary.year} 年</h1>
        </div>
        <dl className="flex flex-wrap gap-2 text-[12px]">
          <MetaChip term="資料截至" value={formatDateTime(summary.asOf)} />
          <MetaChip term="成本配對" value="FIFO 先進先出" />
          <MetaChip term="匯率" value={summary.fxRateSource} />
        </dl>
      </div>

      <div className="rule-double mt-7 pb-5">
        <p className="text-[14px] text-fg-2">收入 · 以收到當下的台幣價值認列</p>
        <HeroAmount value={summary.totalIncomeTwd} />
        <p className="mt-2 text-[13px] text-fg-3">
          共 <span className="num text-fg-2">{summary.incomeEventCount}</span> 筆收款。這個數字在收到錢的那一刻就確定，之後幣價怎麼變都不會改。
        </p>
      </div>

      <ol className="mt-1 divide-y divide-border">
        <StatementLine index="一" label="已實現利得" hint="出金時，比收到當下的價值多出來的部分" value={summary.totalRealizedGainTwd} signed />
        <StatementLine index="二" label="已實現損失" hint="出金時，比收到當下的價值少掉的部分" value={summary.totalRealizedLossTwd} signed />
        <StatementLine
          index="附"
          muted
          label="已出金（MAX 實收台幣）"
          hint={`${summary.cashoutEventCount} 筆，供對照銀行入帳用`}
          value={summary.totalCashoutTwd}
        />
      </ol>

      <div className="mt-5 rounded-[10px] border border-border bg-muted px-4 py-4 md:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[14px] font-medium">仍持有、尚未出金</p>
          <p className="text-[12px] text-fg-3">已算進今年收入；之後出金才會產生利得或損失</p>
        </div>
        {summary.stillHeld.length === 0 ? (
          <p className="mt-2 text-[14px] text-fg-3">目前沒有未出金的餘額。</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
            {summary.stillHeld.map((h) => (
              <li key={`${h.chain}-${h.token}`} className="flex items-center gap-3">
                <ChainBadge chain={h.chain} />
                <span className="num text-[20px] font-medium tracking-[-0.02em]">{formatTokenAmount(h.amountToken)}</span>
                <span className="num text-[12px] text-fg-3">{h.token}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-5 max-w-[62ch] text-[12.5px] leading-[1.8] text-fg-3">
        利得與損失分開列示，能不能互相抵銷由會計師判斷。這份摘要只整理收入與出金紀錄，<strong className="font-medium text-fg-2">不計算應納稅額</strong>
        ——匯出後交給會計師或記帳士決定申報方式。
      </p>
    </div>
  )
}

function HeroAmount({ value }: { value: string }) {
  const { sign, prefix, amount } = formatTwdParts(value)
  return (
    <p className="mt-1 flex items-baseline gap-2 font-semibold leading-[1.1] tracking-[-0.04em]">
      <span className="text-[20px] font-medium tracking-normal text-fg-3 md:text-[24px]">
        {sign}
        {prefix}
      </span>
      <span className="num text-[46px] md:text-[60px]">{amount}</span>
    </p>
  )
}

function MetaChip({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1">
      <dt className="text-fg-3">{term}</dt>
      <dd className="text-fg-2">{value}</dd>
    </div>
  )
}

function StatementLine({
  index,
  label,
  hint,
  value,
  signed = false,
  muted = false,
}: {
  index: string
  label: string
  hint: string
  value: string
  signed?: boolean
  muted?: boolean
}) {
  return (
    <li className="grid grid-cols-[2rem_1fr_auto] items-baseline gap-x-3 py-3.5">
      <span className="text-[14px] text-fg-3">{index}</span>
      <span>
        <span className={`block text-[15px] ${muted ? 'text-fg-2' : 'font-medium'}`}>{label}</span>
        <span className="block text-[12.5px] text-fg-3">{hint}</span>
      </span>
      <Money value={value} signed={signed} className={`text-[18px] ${muted ? 'text-fg-2' : ''}`} />
    </li>
  )
}

export function SummarySkeleton() {
  return (
    <div className="px-6 py-6 md:px-8 md:py-8" aria-busy aria-label="讀取年度摘要中">
      <SkeletonBar className="h-3 w-24" />
      <SkeletonBar className="mt-3 h-7 w-28" />
      <SkeletonBar className="mt-8 h-3.5 w-44" />
      <SkeletonBar className="mt-3 h-14 w-72" />
      <div className="mt-8 space-y-4">
        <SkeletonBar className="h-5 w-full" />
        <SkeletonBar className="h-5 w-full" />
        <SkeletonBar className="h-5 w-4/5" />
      </div>
      <SkeletonBar className="mt-7 h-20 w-full" />
    </div>
  )
}

export function SummaryOnboarding({ name, onConnect, onImport }: { name: string | null; onConnect: () => void; onImport: () => void }) {
  const steps = [
    { title: '連結 MoonPay Commerce', body: '國外客戶付的 USDC 會自動出現在收入紀錄，並換算成當天的台幣價值。' },
    { title: '把錢轉到 MAX、賣成台幣', body: '用右邊的地址對照表，選對網路再轉，避免轉錯鏈。' },
    { title: '匯入 MAX 的交易紀錄 CSV', body: '每一筆出金會用 FIFO 對到你的收入，年底一鍵匯出給會計師。' },
  ]
  return (
    <div className="px-6 py-8 md:px-10 md:py-10">
      <Eyebrow>開始使用</Eyebrow>
      <h1 className="mt-2 text-[28px] font-semibold leading-snug tracking-[-0.03em] md:text-[32px]">
        {name ? `${name}，` : ''}你的帳本還是空的
      </h1>
      <p className="mt-2 max-w-[52ch] text-[15px] text-fg-2">三個步驟之後，這裡會變成一本可以直接交給會計師的年度收入帳。</p>
      <ol className="mt-7 grid gap-3 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="rounded-[10px] border border-border bg-muted p-4">
            <span className="num text-[12px] text-primary-ink">0{i + 1}</span>
            <p className="mt-1 text-[15px] font-medium">{s.title}</p>
            <p className="mt-1 text-[13px] leading-[1.7] text-fg-2">{s.body}</p>
          </li>
        ))}
      </ol>
      <div className="mt-7 flex flex-wrap gap-3">
        <Button variant="primary" onClick={onConnect}>
          <Link2 className="size-4" aria-hidden />
          連結 MoonPay Commerce
        </Button>
        <Button onClick={onImport}>
          <Upload className="size-4" aria-hidden />
          我已經有 MAX 紀錄，先匯入
        </Button>
      </div>
    </div>
  )
}

export function SummaryEmptyYear({ year, onJumpToCurrent }: { year: number; onJumpToCurrent: () => void }) {
  return (
    <div className="px-6 py-10 md:px-10">
      <Eyebrow>年度對帳摘要</Eyebrow>
      <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.03em]">{year} 年沒有任何紀錄</h1>
      <p className="mt-2 max-w-[52ch] text-[14px] text-fg-2">
        這一年沒有收款，也沒有出金。如果你在這年有收過加密貨幣，可以手動補登，或匯入當年的 MAX 紀錄。
      </p>
      <Button className="mt-6" onClick={onJumpToCurrent}>
        回到今年
        <ArrowUpRight className="size-4" aria-hidden />
      </Button>
    </div>
  )
}
