import { CircleCheck, FilePlus2, Upload } from 'lucide-react'
import type { CashoutEvent, SourceStatus } from '../types/ledger'
import { CHAIN_LABEL, formatDateTime, formatMonthDay, formatTokenAmount } from '../lib/format'
import { AttentionIcon, Button, Eyebrow, SkeletonBar } from './atoms'

export function UnreconciledNotice({
  items,
  onReview,
  onAddIncome,
}: {
  items: CashoutEvent[]
  onReview: (cashoutId: string) => void
  onAddIncome: () => void
}) {
  if (items.length === 0) {
    return (
      <div className="flex items-start gap-3 px-5 py-5">
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
        <div>
          <p className="text-[15px] font-medium">每筆出金都對上了收入</p>
          <p className="mt-0.5 text-[13px] text-fg-2">沒有需要補資料的地方，利得與損失都算得出來。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden px-5 py-5">
      <div className="flex items-start gap-3">
        <AttentionIcon />
        <div className="min-w-0">
          <p className="text-[16px] font-semibold leading-snug text-danger-deep">
            {items.length} 筆出金對不上收入紀錄
          </p>
          <p className="mt-1 text-[13px] leading-[1.75] text-fg-2">這部分的利得／損失還算不出來，今年的數字因此不完整。</p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((c) => (
          <li key={c.id} className="rounded-[8px] border border-danger/25 bg-danger-soft/60 px-3.5 py-3 text-[13px] leading-[1.7]">
            <span className="num text-fg-2">{formatMonthDay(c.executedAt)}</span> 從 {CHAIN_LABEL[c.chain]} 出金{' '}
            <span className="num">{formatTokenAmount(c.tokenAmountSold)}</span> {c.tokenSold}，其中{' '}
            <strong className="num font-medium text-danger-deep">
              {formatTokenAmount(c.unmatchedAmountToken ?? '0')} {c.tokenSold}
            </strong>{' '}
            找不到對應的收入。
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Button size="sm" variant="danger" onClick={() => onReview(c.id)}>
                查看這筆出金
              </Button>
              <Button size="sm" variant="ghost" onClick={onAddIncome}>
                <FilePlus2 className="size-[14px]" aria-hidden />
                補登一筆收入
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] leading-[1.7] text-fg-3">常見原因：有一筆收款沒匯入，或這些幣是從其他錢包轉進來的。我們不會替你猜。</p>
    </div>
  )
}

export function SourcesPanel({
  status,
  onImportCsv,
  onManualEntry,
}: {
  status: SourceStatus
  onImportCsv: () => void
  onManualEntry: () => void
}) {
  const { moonpayCommerce: mpc, max } = status
  return (
    <div className="px-5 py-5">
      <Eyebrow>資料來源</Eyebrow>
      <ul className="mt-3 divide-y divide-border">
        <SourceRow
          name="MoonPay Commerce"
          role="收款"
          ok={mpc.connected}
          detail={mpc.connected && mpc.lastSyncedAt ? `自動同步 · ${formatDateTime(mpc.lastSyncedAt)}` : '尚未連結'}
        />
        <SourceRow
          name="MAX"
          role="出金"
          ok={max.method !== 'none'}
          detail={
            max.method === 'none' || !max.lastImportedAt
              ? '尚未匯入任何紀錄'
              : `${max.method === 'csv' ? 'CSV 匯入' : '唯讀連線'} · ${formatDateTime(max.lastImportedAt)}`
          }
          file={max.fileName}
        />
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={onImportCsv}>
          <Upload className="size-[14px]" aria-hidden />
          匯入 MAX CSV
        </Button>
        <Button size="sm" variant="ghost" onClick={onManualEntry}>
          <FilePlus2 className="size-[14px]" aria-hidden />
          手動補登收入
        </Button>
      </div>
    </div>
  )
}

function SourceRow({ name, role, ok, detail, file }: { name: string; role: string; ok: boolean; detail: string; file?: string | null }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <span aria-hidden className={`mt-[7px] size-2 shrink-0 rounded-full ${ok ? 'bg-success' : 'bg-border-strong'}`} />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-2 text-[14px]">
          <span className="font-medium">{name}</span>
          <span className="text-[12px] text-fg-3">{role}</span>
        </p>
        <p className="text-[12.5px] text-fg-2">{detail}</p>
        {file ? <p className="mt-0.5 truncate font-mono text-[11.5px] text-fg-3">{file}</p> : null}
      </div>
    </li>
  )
}

export function SidePanelSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 px-5 py-5" aria-busy>
      <SkeletonBar className="h-3 w-20" />
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonBar key={i} className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}
