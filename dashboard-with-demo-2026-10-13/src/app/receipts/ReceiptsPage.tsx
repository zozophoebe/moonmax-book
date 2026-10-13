import { useState } from 'react'
import { ArrowRight, ArrowUpRight, CircleCheck, ExternalLink, Info, RotateCw, TriangleAlert } from 'lucide-react'
import type { Attribution, OutgoingTransfer, Receipt, ReceiptSource, ReceiptsView, ReceiptTotals } from '../../types/receipts'
import { formatDate, formatTime, formatTokenAmount } from '../../lib/format'
import { useResource } from '../../lib/useResource'
import { getReceipts } from '../../services/receipts'
import { Button, Card, Eyebrow, Money, NetworkBadge, SectionError, SkeletonBar } from '../../components/atoms'
import { href } from '../router'

const ALL = 'all'

const ATTRIBUTION: Record<Attribution, { label: string; hint: string; cls: string }> = {
  webhook: { label: 'MoonPay 通知', hint: 'MoonPay 的 webhook 寫明是這個 Pay Link。', cls: 'border-success/20 bg-success-soft text-success' },
  'only-paylink': { label: '推測', hint: '這個錢包只有這一個 Pay Link 在用，所以推測是它。設定 webhook 就能確定。', cls: 'border-border bg-muted text-fg-2' },
  'price-match': { label: '推測', hint: '金額跟這個 Pay Link 的售價相符，所以推測是它。設定 webhook 就能確定。', cls: 'border-border bg-muted text-fg-2' },
  unmatched: { label: '分不出來', hint: '確定是 MoonPay 的付款，但幾個 Pay Link 共用錢包、金額也對不上。設定 webhook 就能分。', cls: 'border-warn/25 bg-warn-soft text-warn' },
  'not-moonpay': { label: '不是 MoonPay', hint: '直接轉進錢包的錢，不是透過 MoonPay 付款。不算進收入。', cls: 'border-border bg-muted text-fg-3' },
}

export function ReceiptsPage() {
  const [view, reload] = useResource(getReceipts, [])
  const [active, setActive] = useState<string>(ALL)

  return (
    <div className="mx-auto max-w-[1280px] px-5 pb-32 pt-8 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[680px]">
          <p className="text-[12.5px] font-medium tracking-[0.06em] text-primary-ink">收款紀錄</p>
          <h1 className="mt-1.5 text-[26px] font-semibold leading-tight tracking-[-0.035em] md:text-[30px]">每個網站收了多少</h1>
          <p className="mt-2 text-[14px] leading-[1.7] text-fg-3">
            直接從區塊鏈讀你的收款錢包，再用 MoonPay 的通知分出每筆屬於哪個 Pay Link。金額和時間以鏈上為準，不需要 API 金鑰。
          </p>
        </div>
        <div className="flex items-center gap-3">
          {view.status === 'ready' ? <span className="num text-[12px] text-fg-3">讀取時間 {formatTime(view.data.checkedAt)}</span> : null}
          <Button onClick={reload} disabled={view.status === 'loading'}>
            <RotateCw className={`size-4 ${view.status === 'loading' ? 'animate-spin' : ''}`} aria-hidden />
            重新讀取
          </Button>
        </div>
      </header>

      {view.status === 'loading' ? (
        <div className="mt-6 space-y-4" aria-busy aria-label="讀取中">
          <SkeletonBar className="h-10 w-2/3 rounded-lg" />
          <SkeletonBar className="h-[104px] rounded-xl" />
          <SkeletonBar className="h-[220px] rounded-xl" />
          <p className="text-[13px] text-fg-3">正在讀區塊鏈和 MoonPay…第一次會比較久，之後有快取。</p>
        </div>
      ) : view.status === 'error' ? (
        <Card className="mt-6">
          <SectionError title="收款紀錄讀不到" error={view.error} onRetry={reload} />
        </Card>
      ) : view.data.sources.length === 0 ? (
        <NoSources />
      ) : (
        <Loaded view={view.data} active={active} onSelect={setActive} />
      )}
    </div>
  )
}

function NoSources() {
  return (
    <Card className="mt-6">
      <div className="px-6 py-10 text-center">
        <p className="text-[15px] font-semibold">還沒有收款來源</p>
        <p className="mx-auto mt-1 max-w-[46ch] text-[13.5px] leading-[1.7] text-fg-3">先在「開始使用」加入你的 Pay Link，MoonMax Book 才知道要讀哪個錢包。</p>
        <a
          href={href('#/')}
          className="focus-ring mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-medium text-primary-fg shadow-sheet transition-transform duration-150 hover:bg-primary-hover active:scale-[0.97]"
        >
          去加入 Pay Link
          <ArrowRight className="size-3.5" aria-hidden />
        </a>
      </div>
    </Card>
  )
}

function Loaded({ view, active, onSelect }: { view: ReceiptsView; active: string; onSelect: (key: string) => void }) {
  const source = view.sources.find((s) => s.key === active) ?? null
  const key = source ? source.key : ALL
  const rows = key === ALL ? view.receipts.filter((r) => r.sourceKey !== 'other') : view.receipts.filter((r) => r.sourceKey === key)
  const totals: ReceiptTotals = source ?? view.totals
  const labelOf = (k: string) => view.sources.find((s) => s.key === k)?.label ?? k
  const guessed = rows.some((r) => r.attribution === 'unmatched' || r.attribution === 'only-paylink' || r.attribution === 'price-match')

  return (
    <>
      <SourceTabs sources={view.sources} totalCount={view.totals.count} active={key} onSelect={onSelect} />

      <div className="mt-4">
        <TotalsCard totals={totals} source={source} />
      </div>

      {guessed ? (
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5 text-[13px] leading-[1.7] text-fg-2">
          <Info className="mt-[3px] size-4 shrink-0 text-fg-3" aria-hidden />
          {view.webhookConfigured ? (
            <span>標成「推測」或「分不出來」的，是設定 MoonPay 通知之前收的款，只能從錢包和金額推測。之後收的每一筆都會標上確定的 Pay Link。</span>
          ) : (
            <span>
              標成「推測」或「分不出來」的，是因為還沒設定 MoonPay 通知。
              <a href={href('#/')} className="focus-ring ml-1 rounded font-medium text-fg underline decoration-primary decoration-2 underline-offset-[3px]">
                到開始使用第 3 步設定
              </a>
              ，之後每筆都會標上確定的 Pay Link。
            </span>
          )}
        </p>
      ) : null}

      <Card className="mt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-3.5">
          <h2 className="text-[15px] font-semibold">{source ? source.label : '全部收款'}</h2>
          <span className="text-[12px] text-fg-3">台幣價值 = 買家付的 USDC × 收到當天的匯率</span>
        </div>
        {rows.length ? <ReceiptTable rows={rows} showSource={key === ALL} labelOf={labelOf} /> : <p className="px-5 py-10 text-center text-[13.5px] text-fg-3">這個來源還沒有收款。</p>}
      </Card>

      {view.outgoing.length ? (
        <Card className="mt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-3.5">
            <h2 className="text-[15px] font-semibold">轉出紀錄</h2>
            <span className="text-[12px] text-fg-3">從收款錢包轉出去的 USDC。轉到 MAX 的，之後會跟 MAX 的出金紀錄對起來。</span>
          </div>
          <OutgoingTable rows={view.outgoing} />
        </Card>
      ) : null}

      <Footnotes view={view} />
    </>
  )
}

function SourceTabs({ sources, totalCount, active, onSelect }: { sources: ReceiptSource[]; totalCount: number; active: string; onSelect: (key: string) => void }) {
  const tabs = [{ key: ALL, label: '全部', count: totalCount, muted: false }, ...sources.map((s) => ({ key: s.key, label: s.label, count: s.count, muted: s.kind !== 'paylink' }))]
  return (
    <div role="tablist" aria-label="收款來源" className="mt-6 flex gap-1.5 overflow-x-auto pb-1">
      {tabs.map((t) => {
        const selected = t.key === active
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(t.key)}
            className={`focus-ring inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-[13.5px] transition-transform duration-150 active:scale-[0.97] ${
              selected ? 'border-fg bg-fg text-card' : `border-border bg-card shadow-sheet hover:bg-muted ${t.muted ? 'text-fg-3' : 'text-fg'}`
            }`}
          >
            {t.label}
            <span className={`num rounded px-1 text-[11.5px] ${selected ? 'bg-white/15 text-card' : 'bg-muted text-fg-3'}`}>{t.count}</span>
          </button>
        )
      })}
    </div>
  )
}

function TotalsCard({ totals, source }: { totals: ReceiptTotals; source: ReceiptSource | null }) {
  const stats: { label: string; value: string; unit?: string; twd?: boolean }[] = [
    { label: '筆數', value: String(totals.count) },
    { label: '買家付', value: formatTokenAmount(totals.grossTotalToken), unit: 'USDC' },
    { label: 'MoonPay 手續費', value: formatTokenAmount(totals.feeTotalToken), unit: 'USDC' },
    { label: '進到你錢包', value: formatTokenAmount(totals.netTotalToken), unit: 'USDC' },
  ]
  return (
    <div className="animate-rise rounded-xl border border-border bg-card px-5 py-4 shadow-sheet">
      {source?.kind === 'paylink' ? (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border pb-3 text-[12.5px] text-fg-3">
          {source.paylinkName && source.paylinkName !== source.label ? <span>MoonPay 名稱：{source.paylinkName}</span> : null}
          {source.siteUrl ? (
            <a href={source.siteUrl} target="_blank" rel="noreferrer" className="focus-ring inline-flex items-center gap-1 rounded font-mono text-fg-2 hover:text-fg">
              {source.siteUrl.replace(/^https?:\/\//, '')}
              <ArrowUpRight className="size-3" aria-hidden />
            </a>
          ) : null}
          {!source.registered ? <span className="text-warn">MoonPay 通知裡出現的 Pay Link，還沒加進開始使用。</span> : null}
        </div>
      ) : null}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-[12.5px] text-fg-3">{s.label}</dt>
            <dd className="num mt-0.5 text-[22px] font-semibold tracking-[-0.02em]">
              {s.value}
              {s.unit ? <span className="ml-1 text-[12px] font-medium text-fg-3">{s.unit}</span> : null}
            </dd>
          </div>
        ))}
        <div className="col-span-2 md:col-span-1">
          <dt className="text-[12.5px] text-fg-3">台幣價值（參考）</dt>
          <dd className="mt-0.5 text-[22px] font-semibold tracking-[-0.02em]">{totals.twdTotal !== null ? <Money value={totals.twdTotal} /> : <span className="text-[14px] font-normal text-fg-3">匯率還沒取得</span>}</dd>
        </div>
      </dl>
    </div>
  )
}

const TH = 'py-2.5 text-left text-[12px] font-normal tracking-[0.04em] text-fg-3'
const TD = 'py-3 align-top'

function AttributionChip({ a }: { a: Attribution }) {
  const { label, hint, cls } = ATTRIBUTION[a]
  return (
    <span title={hint} className={`inline-flex cursor-help rounded-md border px-1.5 text-[11.5px] leading-5 ${cls}`}>
      {label}
    </span>
  )
}

function TxLink({ url }: { url: string }) {
  if (!url) return <span className="text-fg-3">—</span>
  return (
    <a href={url} target="_blank" rel="noreferrer" className="focus-ring inline-flex items-center gap-1 rounded text-[12.5px] text-fg-2 hover:text-fg" aria-label="在區塊鏈瀏覽器打開這筆交易">
      鏈上紀錄
      <ExternalLink className="size-3" aria-hidden />
    </a>
  )
}

function ReceiptTable({ rows, showSource, labelOf }: { rows: Receipt[]; showSource: boolean; labelOf: (key: string) => string }) {
  return (
    <div className="px-4 pb-4 md:px-5">
      <table className="hidden w-full border-collapse text-[14px] md:table">
        <thead>
          <tr className="border-b border-border-strong">
            <th className={`${TH} w-[132px]`}>收到時間（台北）</th>
            <th className={TH}>{showSource ? '來源' : '對應方式'}</th>
            <th className={`${TH} w-[96px]`}>網路</th>
            <th className={`${TH} w-[104px] text-right`}>買家付</th>
            <th className={`${TH} w-[92px] text-right`}>手續費</th>
            <th className={`${TH} w-[104px] text-right`}>進到錢包</th>
            <th className={`${TH} w-[120px] text-right`}>台幣價值</th>
            <th className={`${TH} w-[96px] text-right`}>　</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-muted">
              <td className={`${TD} num text-[13px] text-fg-2`}>
                {formatDate(r.receivedAt)}
                <span className="block text-[11.5px] text-fg-3">{formatTime(r.receivedAt)}</span>
              </td>
              <td className={`${TD} pr-3`}>
                <div className="flex flex-wrap items-center gap-1.5">
                  {showSource ? <span className="text-[13.5px] font-medium">{labelOf(r.sourceKey)}</span> : null}
                  <AttributionChip a={r.attribution} />
                  {!r.verifiedOnChain ? (
                    <span title="只有 MoonPay 通知，鏈上還沒核對到這筆交易" className="inline-flex cursor-help rounded-md border border-warn/25 bg-warn-soft px-1.5 text-[11.5px] leading-5 text-warn">
                      鏈上未核對
                    </span>
                  ) : null}
                </div>
              </td>
              <td className={TD}>
                <NetworkBadge chain={r.chain} />
              </td>
              <td className={`${TD} num text-right`}>{r.grossToken ? formatTokenAmount(r.grossToken) : '—'}</td>
              <td className={`${TD} num text-right text-fg-3`}>{r.feeToken ? formatTokenAmount(r.feeToken) : '—'}</td>
              <td className={`${TD} num text-right font-medium`}>{formatTokenAmount(r.netToken)}</td>
              <td className={`${TD} text-right`}>
                {r.twdValue !== null ? <Money value={r.twdValue} /> : <span className="text-fg-3">—</span>}
                {r.fxRateTwdPerUsd ? <span className="num block text-[11px] text-fg-3">× {r.fxRateTwdPerUsd}</span> : null}
              </td>
              <td className={`${TD} text-right`}>
                <TxLink url={r.explorerUrl} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-border md:hidden">
        {rows.map((r) => (
          <li key={r.id} className="py-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="num text-[12.5px] text-fg-3">
                {formatDate(r.receivedAt)} {formatTime(r.receivedAt)}
              </span>
              <NetworkBadge chain={r.chain} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {showSource ? <span className="text-[14px] font-medium">{labelOf(r.sourceKey)}</span> : null}
              <AttributionChip a={r.attribution} />
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <span className="num text-[13px] text-fg-2">
                {formatTokenAmount(r.netToken)} USDC
                {r.feeToken ? <span className="text-fg-3">（手續費 {formatTokenAmount(r.feeToken)}）</span> : null}
              </span>
              {r.twdValue !== null ? <Money value={r.twdValue} className="text-[15px]" /> : null}
            </div>
            <div className="mt-1">
              <TxLink url={r.explorerUrl} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function OutgoingTable({ rows }: { rows: OutgoingTransfer[] }) {
  return (
    <ul className="divide-y divide-border px-5">
      {rows.map((o) => (
        <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-3">
          <span className="num w-[132px] text-[13px] text-fg-2">
            {formatDate(o.sentAt)} {formatTime(o.sentAt)}
          </span>
          <span className="num min-w-[110px] text-[14px] font-medium">
            −{formatTokenAmount(o.amountToken)} <span className="text-[12px] font-normal text-fg-3">{o.token}</span>
          </span>
          {o.toMax ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-success/20 bg-success-soft px-1.5 text-[11.5px] leading-5 text-success">
              <CircleCheck className="size-3" aria-hidden />
              轉到 MAX
            </span>
          ) : (
            <span className="rounded-md border border-border bg-muted px-1.5 text-[11.5px] leading-5 text-fg-3">轉到其他地址</span>
          )}
          <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-fg-3">{o.to ?? '—'}</span>
          <TxLink url={o.explorerUrl} />
        </li>
      ))}
    </ul>
  )
}

function Footnotes({ view }: { view: ReceiptsView }) {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <Eyebrow>這些數字怎麼來的</Eyebrow>
        <ul className="mt-2.5 space-y-1.5 text-[12.5px] leading-[1.7] text-fg-2">
          <li>金額、時間：Solana 區塊鏈上的交易紀錄，點「鏈上紀錄」可以自己核對。</li>
          <li>手續費：同一筆交易裡分給 MoonPay 的部分。</li>
          <li>台幣價值：買家付的 USDC（視為 1 美元）× 收到當天的美元兌台幣匯率。匯率來源：{view.fxRateSource}。</li>
        </ul>
      </div>
      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <Eyebrow>讀了哪些錢包</Eyebrow>
        <ul className="mt-2.5 space-y-2 text-[12.5px] leading-[1.6]">
          {view.wallets.map((w) => (
            <li key={w.address} className="flex items-start gap-2">
              <NetworkBadge chain={w.chain} className="mt-[1px]" />
              <span className="min-w-0">
                <span className="block break-all font-mono text-fg-2">{w.address}</span>
                {w.error ? (
                  <span className="flex items-center gap-1 text-danger-deep">
                    <TriangleAlert className="size-3" aria-hidden />
                    {w.error}
                  </span>
                ) : !w.readable ? (
                  <span className="text-fg-3">{w.note}</span>
                ) : (
                  <span className="text-fg-3">已從鏈上讀取</span>
                )}
              </span>
            </li>
          ))}
          {!view.wallets.length ? <li className="text-fg-3">沒有收款錢包。</li> : null}
        </ul>
      </div>
    </div>
  )
}
