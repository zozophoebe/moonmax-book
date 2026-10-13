import type { ReactNode } from 'react'
import { ChevronDown, FilePlus2, Inbox, Upload } from 'lucide-react'
import type { CashoutEvent, IncomeEvent, LotConsumption } from '../types/ledger'
import { formatDate, formatTokenAmount, isNegative, isZero } from '../lib/format'
import { AttentionIcon, Button, ChainBadge, Money, SkeletonBar } from './atoms'

export type LedgerTab = 'income' | 'cashout'

export function LedgerTabs({
  active,
  onChange,
  counts,
}: {
  active: LedgerTab
  onChange: (tab: LedgerTab) => void
  counts: Record<LedgerTab, number | null>
}) {
  const tabs: { key: LedgerTab; label: string; source: string }[] = [
    { key: 'income', label: '收入紀錄', source: 'MoonPay Commerce' },
    { key: 'cashout', label: '出金紀錄', source: 'MAX' },
  ]
  return (
    <div role="tablist" aria-label="帳冊" className="flex gap-1 border-b border-border px-4 md:px-6">
      {tabs.map((t) => {
        const selected = t.key === active
        return (
          <button
            key={t.key}
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={selected}
            aria-controls={`panel-${t.key}`}
            onClick={() => onChange(t.key)}
            className={`focus-ring relative -mb-px flex items-baseline gap-2 border-b-2 px-3 pb-3 pt-4 text-[15px] transition-transform duration-150 active:scale-[0.98] ${
              selected ? 'border-fg font-medium text-fg' : 'border-transparent text-fg-3 hover:text-fg-2'
            }`}
          >
            <span className="">{t.label}</span>
            <span className="num text-[12px] text-fg-3">{counts[t.key] ?? '—'}</span>
            <span className="hidden text-[11px] text-fg-3 sm:inline">· {t.source}</span>
          </button>
        )
      })}
    </div>
  )
}

const TH = 'py-2.5 text-left text-[12px] font-normal tracking-[0.04em] text-fg-3'
const TD = 'py-3 align-top'

function LineNo({ n }: { n: number }) {
  return <span className="num text-[11.5px] text-fg-3">{String(n).padStart(2, '0')}</span>
}

function SourceTag({ manual }: { manual: boolean }) {
  if (!manual) return null
  return <span className="ml-2 rounded-[4px] border border-border-strong px-1.5 text-[11px] leading-[18px] text-fg-2">手動補登</span>
}

export function IncomeLedger({ events, totalTwd, onManualEntry }: { events: IncomeEvent[]; totalTwd: string | null; onManualEntry: () => void }) {
  if (events.length === 0) {
    return (
      <LedgerEmpty
        title="還沒有收入紀錄"
        body="連結 MoonPay Commerce 後，國外客戶的付款會自動記在這裡；私下收的款項可以手動補登。"
        action={
          <Button size="sm" onClick={onManualEntry}>
            <FilePlus2 className="size-[14px]" aria-hidden />
            手動補登收入
          </Button>
        }
      />
    )
  }
  return (
    <div className="px-4 pb-6 md:px-6">
      <p className="pt-4 text-[12.5px] text-fg-3">台幣價值以收到當天的匯率換算，記下之後就不再變動。</p>

      <table className="mt-2 hidden w-full border-collapse text-[14px] md:table">
        <thead>
          <tr className="border-b border-border-strong">
            <th className={`${TH} w-10`}>行</th>
            <th className={`${TH} w-[104px]`}>日期</th>
            <th className={TH}>付款方／備註</th>
            <th className={`${TH} w-[92px]`}>網路</th>
            <th className={`${TH} w-[108px] text-right`}>USDC</th>
            <th className={`${TH} w-[92px] text-right`}>當日匯率</th>
            <th className={`${TH} w-[120px] text-right`}>台幣價值</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e, i) => (
            <tr key={e.id} className="border-b border-border hover:bg-muted">
              <td className={TD}>
                <LineNo n={i + 1} />
              </td>
              <td className={`${TD} num text-[13px] text-fg-2`}>{formatDate(e.receivedAt)}</td>
              <td className={`${TD} pr-4 leading-[1.6] [word-break:keep-all] [text-wrap:pretty]`}>
                {e.payerReference ?? '—'}
                <SourceTag manual={e.source === 'manual'} />
              </td>
              <td className={TD}>
                <ChainBadge chain={e.chain} />
              </td>
              <td className={`${TD} num text-right`}>{formatTokenAmount(e.grossAmountToken)}</td>
              <td className={`${TD} text-right`}>
                <span className="num text-fg-2">{e.fxRateTwdPerUsd}</span>
                {e.usdPerToken !== '1.0000' ? (
                  <span className="num block text-[11px] text-fg-3" title="當天 USDC 對美元的實際價格">
                    USDC＝{e.usdPerToken}
                  </span>
                ) : null}
              </td>
              <td className={`${TD} text-right`}>
                <Money value={e.twdValueAtReceipt} />
              </td>
            </tr>
          ))}
        </tbody>
        {totalTwd ? (
          <tfoot>
            <tr>
              <td />
              <td colSpan={5} className="pt-3 text-[13px] text-fg-2">
                合計 <span className="num">{events.length}</span> 筆
              </td>
              <td className="pt-3 text-right">
                <span className="rule-double inline-block pb-0.5">
                  <Money value={totalTwd} className="font-medium" />
                </span>
              </td>
            </tr>
          </tfoot>
        ) : null}
      </table>

      <ul className="mt-3 divide-y divide-border md:hidden">
        {events.map((e) => (
          <li key={e.id} className="py-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="num text-[12.5px] text-fg-3">{formatDate(e.receivedAt)}</span>
              <ChainBadge chain={e.chain} />
            </div>
            <p className="mt-1 text-[14px] leading-[1.6] [word-break:keep-all] [text-wrap:pretty]">
              {e.payerReference ?? '—'}
              <SourceTag manual={e.source === 'manual'} />
            </p>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="num text-[13px] text-fg-2">
                {formatTokenAmount(e.grossAmountToken)} USDC × {e.fxRateTwdPerUsd}
              </span>
              <Money value={e.twdValueAtReceipt} className="text-[15px]" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CashoutLedger({
  events,
  totalTwd,
  expandedIds,
  onToggle,
  onImportCsv,
  onAddIncome,
}: {
  events: CashoutEvent[]
  totalTwd: string | null
  expandedIds: ReadonlySet<string>
  onToggle: (id: string) => void
  onImportCsv: () => void
  onAddIncome: () => void
}) {
  if (events.length === 0) {
    return (
      <LedgerEmpty
        title="還沒有出金紀錄"
        body="在 MAX 把 USDC 賣成台幣後，匯出交易紀錄 CSV 匯入這裡，每筆出金就會自動對到你的收入。"
        action={
          <Button size="sm" onClick={onImportCsv}>
            <Upload className="size-[14px]" aria-hidden />
            匯入 MAX CSV
          </Button>
        }
      />
    )
  }
  return (
    <div className="px-4 pb-6 md:px-6">
      <p className="pt-4 text-[12.5px] text-fg-3">展開每筆出金，可以看到它用 FIFO（先進先出）對到哪幾筆收入、各自賺或賠多少。</p>

      <table className="mt-2 hidden w-full border-collapse text-[14px] md:table">
        <thead>
          <tr className="border-b border-border-strong">
            <th className={`${TH} w-10`}>行</th>
            <th className={`${TH} w-[104px]`}>日期</th>
            <th className={`${TH} w-[92px]`}>網路</th>
            <th className={`${TH} text-right`}>賣出 USDC</th>
            <th className={`${TH} text-right`}>實收台幣</th>
            <th className={`${TH} w-[72px] text-right`}>手續費</th>
            <th className={`${TH} w-[176px] text-right`}>對帳結果</th>
            <th className={`${TH} w-12`}>
              <span className="sr-only">展開</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((c, i) => {
            const open = expandedIds.has(c.id)
            return (
              <CashoutRows key={c.id} c={c} n={i + 1} open={open} onToggle={() => onToggle(c.id)} onAddIncome={onAddIncome} />
            )
          })}
        </tbody>
        {totalTwd ? (
          <tfoot>
            <tr>
              <td />
              <td colSpan={3} className="pt-3 text-[13px] text-fg-2">
                合計 <span className="num">{events.length}</span> 筆
              </td>
              <td className="pt-3 text-right">
                <span className="rule-double inline-block pb-0.5">
                  <Money value={totalTwd} className="font-medium" />
                </span>
              </td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        ) : null}
      </table>

      <ul className="mt-3 divide-y divide-border md:hidden">
        {events.map((c) => {
          const open = expandedIds.has(c.id)
          return (
            <li key={c.id} id={`cashout-m-${c.id}`} className="py-3.5">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => onToggle(c.id)}
                className="focus-ring w-full rounded-[6px] text-left transition-transform duration-150 active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="num text-[12.5px] text-fg-3">{formatDate(c.executedAt)}</span>
                  <ChainBadge chain={c.chain} />
                </div>
                <div className="mt-1.5 flex items-baseline justify-between gap-3">
                  <span className="num text-[14px]">{formatTokenAmount(c.tokenAmountSold)} USDC</span>
                  <Money value={c.twdAmountReceived} className="text-[15px]" />
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <ReconcileResult c={c} />
                  <ChevronDown
                    className={`size-4 text-fg-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </div>
              </button>
              {open ? <FifoBreakdown c={c} onAddIncome={onAddIncome} compact /> : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function CashoutRows({
  c,
  n,
  open,
  onToggle,
  onAddIncome,
}: {
  c: CashoutEvent
  n: number
  open: boolean
  onToggle: () => void
  onAddIncome: () => void
}) {
  return (
    <>
      <tr
        id={`cashout-${c.id}`}
        onClick={onToggle}
        className={`cursor-pointer border-b ${open ? 'border-transparent bg-muted' : 'border-border'} hover:bg-muted`}
      >
        <td className={TD}>
          <LineNo n={n} />
        </td>
        <td className={`${TD} num text-[13px] text-fg-2`}>{formatDate(c.executedAt)}</td>
        <td className={TD}>
          <ChainBadge chain={c.chain} />
        </td>
        <td className={`${TD} num text-right`}>{formatTokenAmount(c.tokenAmountSold)}</td>
        <td className={`${TD} text-right`}>
          <Money value={c.twdAmountReceived} />
        </td>
        <td className={`${TD} text-right`}>
          <Money value={c.feeTwd} className="text-[13px] text-fg-3" />
        </td>
        <td className={`${TD} text-right`}>
          <ReconcileResult c={c} />
        </td>
        <td className={`${TD} text-right`}>
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? '收合 FIFO 明細' : '展開 FIFO 明細'}
            onClick={(ev) => {
              ev.stopPropagation()
              onToggle()
            }}
            className="focus-ring inline-grid size-8 place-items-center rounded-[6px] text-fg-3 transition-transform duration-150 hover:bg-background hover:text-fg active:scale-[0.92]"
          >
            <ChevronDown className={`size-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden />
          </button>
        </td>
      </tr>
      {open ? (
        <tr className="border-b border-border bg-muted">
          <td />
          <td colSpan={7} className="pb-5 pr-2">
            <FifoBreakdown c={c} onAddIncome={onAddIncome} />
          </td>
        </tr>
      ) : null}
    </>
  )
}

function ReconcileResult({ c }: { c: CashoutEvent }) {
  if (c.isUnreconciled) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/40 bg-danger-soft px-2.5 py-0.5 text-[12px] text-danger-deep">
        <span className="font-semibold">待查</span>
        <span className="num">{formatTokenAmount(c.unmatchedAmountToken ?? '0')} 未對上</span>
      </span>
    )
  }
  if (c.gainLossTwd === null) return <span className="text-fg-3">—</span>
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className="text-[12px] text-fg-3">{isZero(c.gainLossTwd) ? '持平' : isNegative(c.gainLossTwd) ? '損失' : '利得'}</span>
      <Money value={c.gainLossTwd} signed />
    </span>
  )
}

function FifoBreakdown({ c, onAddIncome, compact = false }: { c: CashoutEvent; onAddIncome: () => void; compact?: boolean }) {
  return (
    <div className={`animate-rise ${compact ? 'mt-3' : 'pt-1'}`}>
      <div className="rounded-[10px] border border-border bg-card px-4 py-4 shadow-sheet md:px-5">
        <p className="text-[14px] font-semibold">這筆出金用 FIFO 對到的收入</p>
        <p className="mt-0.5 text-[12px] text-fg-3">先收到的錢先算賣掉。差額＝出金時的價值 − 收到當下的價值。</p>

        {compact ? null : (
          <div className={`mt-3 border-b border-border-strong pb-1.5 text-[11.5px] tracking-[0.04em] text-fg-3 ${FIFO_GRID}`}>
            <span>對到的收入</span>
            <span className="text-right">用掉 USDC</span>
            <span className="text-right">收到當下價值</span>
            <span className="text-right">出金時價值</span>
            <span className="text-right">差額</span>
          </div>
        )}
        <ol className={`${compact ? 'mt-3' : ''} divide-y divide-border text-[13px]`}>
          {c.consumptions.map((s) => (
            <ConsumptionLine key={s.lotId} s={s} compact={compact} />
          ))}
          {c.isUnreconciled ? (
            <li className="py-3">
              <div className="flex items-start gap-3">
                <AttentionIcon className="size-8" />
                <div className="min-w-0 flex-1">
                  <p className="text-danger-deep">
                    <span className="num font-medium">{formatTokenAmount(c.unmatchedAmountToken ?? '0')} USDC</span>{' '}
                    找不到對應的收入紀錄
                  </p>
                  <p className="mt-0.5 text-[12px] text-fg-2">
                    這部分出金價值 <Money value={c.unmatchedProceedsTwd ?? '0'} className="text-[12px]" />
                    ，因為不知道成本，差額先不計算。
                  </p>
                  <Button size="sm" variant="danger" className="mt-2.5" onClick={onAddIncome}>
                    <FilePlus2 className="size-[14px]" aria-hidden />
                    補登這筆收入
                  </Button>
                </div>
              </div>
            </li>
          ) : null}
        </ol>

        <div className="mt-1 flex items-baseline justify-between border-t border-border-strong pt-3">
          <span className="text-[13px] text-fg-2">
            差額小計
            {c.isUnreconciled ? <span className="text-fg-3">（不含未對上的部分）</span> : null}
          </span>
          <span className="rule-double pb-0.5">
            <Money value={c.gainLossTwd ?? '0'} signed className="font-medium" />
          </span>
        </div>
      </div>
    </div>
  )
}

const FIFO_GRID = 'grid grid-cols-[minmax(0,1fr)_84px_108px_108px_92px] items-baseline gap-x-4'

function ConsumptionLine({ s, compact }: { s: LotConsumption; compact: boolean }) {
  const memo = (
    <span className="block leading-[1.55] text-fg-2 [word-break:keep-all] [text-wrap:pretty]">{s.payerReference ?? '—'}</span>
  )
  const date = <span className="num block text-[11.5px] text-fg-3">收入日 {formatDate(s.incomeReceivedAt)}</span>

  if (compact) {
    return (
      <li className="py-2.5">
        {memo}
        {date}
        <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[12.5px]">
          <dt className="text-fg-3">用掉</dt>
          <dd className="num text-right">{formatTokenAmount(s.consumedAmountToken)} USDC</dd>
          <dt className="text-fg-3">收到當下價值</dt>
          <dd className="text-right"><Money value={s.costBasisTwd} className="text-fg-2" /></dd>
          <dt className="text-fg-3">出金時價值</dt>
          <dd className="text-right"><Money value={s.proceedsTwd} /></dd>
          <dt className="text-fg-3">差額</dt>
          <dd className="text-right"><Money value={s.gainLossTwd} signed className="font-medium" /></dd>
        </dl>
      </li>
    )
  }

  return (
    <li className={`py-2.5 ${FIFO_GRID}`}>
      <span className="min-w-0">
        {memo}
        {date}
      </span>
      <span className="num text-right">{formatTokenAmount(s.consumedAmountToken)}</span>
      <span className="text-right"><Money value={s.costBasisTwd} className="text-fg-2" /></span>
      <span className="text-right"><Money value={s.proceedsTwd} /></span>
      <span className="text-right"><Money value={s.gainLossTwd} signed className="font-medium" /></span>
    </li>
  )
}

function LedgerEmpty({ title, body, action }: { title: string; body: string; action: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid size-11 place-items-center rounded-full border border-border bg-muted text-fg-3">
        <Inbox className="size-5" aria-hidden />
      </span>
      <p className="mt-4 text-[18px] font-semibold">{title}</p>
      <p className="mt-1.5 max-w-[44ch] text-[13.5px] leading-[1.75] text-fg-2">{body}</p>
      <div className="mt-5">{action}</div>
    </div>
  )
}

export function LedgerSkeleton() {
  return (
    <div className="px-4 py-5 md:px-6" aria-busy aria-label="讀取帳冊中">
      <SkeletonBar className="h-3 w-64" />
      <div className="mt-5 space-y-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="grid grid-cols-[2rem_6rem_1fr_6rem] items-center gap-4">
            <SkeletonBar className="h-3" />
            <SkeletonBar className="h-3.5" />
            <SkeletonBar className="h-3.5" />
            <SkeletonBar className="h-3.5" />
          </div>
        ))}
      </div>
    </div>
  )
}
