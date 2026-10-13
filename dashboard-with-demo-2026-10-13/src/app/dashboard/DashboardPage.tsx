import { useCallback, useEffect, useRef, useState } from 'react'
import { FileDown, LoaderCircle } from 'lucide-react'
import type { Creator, DepositAddress } from '../../types/ledger'
import { CHAIN_LABEL } from '../../lib/format'
import { useResource } from '../../lib/useResource'
import { getAnnualSummary } from '../../services/annualSummary'
import { getIncomeEvents } from '../../services/incomeEvents'
import { getCashoutEvents } from '../../services/cashoutEvents'
import { getDepositAddresses } from '../../services/depositAddresses'
import { getSourceStatus } from '../../services/sourceStatus'
import { requestAccountantExport } from '../../services/exports'
import { Button, Card, SectionError } from '../../components/atoms'
import { YearToggle } from '../../components/Controls'
import { SummaryEmptyYear, SummaryOnboarding, SummarySkeleton, SummaryStatement } from '../../components/SummaryStatement'
import { SidePanelSkeleton, SourcesPanel, UnreconciledNotice } from '../../components/SidePanels'
import { CashoutLedger, IncomeLedger, LedgerSkeleton, LedgerTabs, type LedgerTab } from '../../components/Ledgers'
import { DepositAddressPanel } from '../../components/DepositAddressPanel'
import { Toast, type ToastMessage } from '../../components/Toast'

// Placeholder for the authenticated session; replaced when auth is wired in.
const SESSION_CREATOR_ID = 'cr_demo_01'
const CURRENT_YEAR = 2026
const YEARS = [2025, 2026]

// Demo-only (/demo/): the full ledger rendered from mock data.
export function DashboardPage({ creator }: { creator: Creator | null }) {
  const [year, setYear] = useState(CURRENT_YEAR)
  const [tab, setTab] = useState<LedgerTab>('income')
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [exporting, setExporting] = useState(false)

  const [summary, reloadSummary] = useResource(() => getAnnualSummary(SESSION_CREATOR_ID, year), [year])
  const [income, reloadIncome] = useResource(() => getIncomeEvents(SESSION_CREATOR_ID, year), [year])
  const [cashout, reloadCashout] = useResource(() => getCashoutEvents(SESSION_CREATOR_ID, year), [year])
  const [addresses] = useResource(() => getDepositAddresses(SESSION_CREATOR_ID), [])
  const [sources] = useResource(() => getSourceStatus(SESSION_CREATOR_ID), [])

  // Open unreconciled cashouts by default — the one thing the creator needs to act on.
  const autoExpandedFor = useRef<number | null>(null)
  useEffect(() => {
    if (cashout.status !== 'ready' || autoExpandedFor.current === year) return
    autoExpandedFor.current = year
    setExpanded(new Set(cashout.data.filter((c) => c.isUnreconciled).map((c) => c.id)))
  }, [cashout, year])

  const toastId = useRef(0)
  const showToast = useCallback((tone: ToastMessage['tone'], text: string) => {
    const id = ++toastId.current
    setToast({ id, tone, text })
    window.setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 3600)
  }, [])

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const reviewCashout = useCallback((id: string) => {
    setTab('cashout')
    setExpanded((prev) => new Set(prev).add(id))
    window.setTimeout(() => {
      const row = document.getElementById(`cashout-${id}`)
      const card = document.getElementById(`cashout-m-${id}`)
      const target = row && row.offsetParent !== null ? row : card
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
  }, [])

  const handleExport = () => {
    setExporting(true)
    requestAccountantExport(SESSION_CREATOR_ID, year)
      .then((r) => showToast('success', `已產生「${r.fileName}」。示範模式不會真的下載，接上後端後會直接存檔。`))
      .catch(() => showToast('info', '匯出沒有成功，請稍後再試一次。'))
      .finally(() => setExporting(false))
  }

  const demoOnly = (what: string) => () => showToast('info', `示範模式：${what}`)
  const openImport = demoOnly('之後這裡會開啟檔案選擇，匯入 MAX 匯出的交易紀錄 CSV。')
  const openManualEntry = demoOnly('之後這裡會打開補登表單（日期、金額、網路、備註），送出後重新對帳。')
  const connectMoonpay = () => window.location.assign('/')
  const addAddress = () => window.location.assign('/#/')
  const copied = (a: DepositAddress) =>
    showToast('success', `已複製 ${CHAIN_LABEL[a.chain]} 入金地址。貼到錢包時，請再確認選的是 ${CHAIN_LABEL[a.chain]} 網路。`)

  const unreconciled = cashout.status === 'ready' ? cashout.data.filter((c) => c.isUnreconciled) : []
  const hasAnyRecords = summary.status === 'ready' && (summary.data.incomeEventCount > 0 || summary.data.cashoutEventCount > 0)
  const neverConnected = sources.status === 'ready' && !sources.data.moonpayCommerce.connected
  const held = summary.status === 'ready' ? summary.data.stillHeld : summary.status === 'loading' ? 'loading' : 'unavailable'
  const totals = summary.status === 'ready' && hasAnyRecords ? summary.data : null

  return (
    <div className="pb-32">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-end justify-between gap-4 px-5 pt-8 md:px-8">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.03em]">示範帳本</h1>
          <p className="mt-0.5 text-[13.5px] text-fg-3">接好 MoonPay 和 MAX 之後，你的年度帳本會長這樣。</p>
        </div>
        <div className="flex items-center gap-2">
          <YearToggle year={year} years={YEARS} onYearChange={setYear} />
          <Button variant="primary" onClick={handleExport} disabled={!hasAnyRecords || exporting} title="供會計師／記帳士使用的對帳紀錄">
            {exporting ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <FileDown className="size-4" aria-hidden />}
            匯出對帳紀錄
          </Button>
        </div>
      </div>


      <main className="mx-auto grid max-w-[1280px] gap-6 px-5 py-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[auto_1fr] lg:items-start">
        <Card delay={0} className="lg:col-start-1 lg:row-start-1">
          {summary.status === 'loading' ? (
            <SummarySkeleton />
          ) : summary.status === 'error' ? (
            <SectionError title="讀不到年度摘要" error={summary.error} onRetry={reloadSummary} />
          ) : !hasAnyRecords && neverConnected ? (
            <SummaryOnboarding
              name={creator?.displayName ?? null}
              onConnect={connectMoonpay}
              onImport={openImport}
            />
          ) : !hasAnyRecords ? (
            <SummaryEmptyYear year={year} onJumpToCurrent={() => setYear(CURRENT_YEAR)} />
          ) : (
            <SummaryStatement summary={summary.data} />
          )}
        </Card>

        <div className="flex flex-col gap-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {cashout.status === 'loading' ? (
            <Card delay={60}>
              <SidePanelSkeleton lines={2} />
            </Card>
          ) : cashout.status === 'error' ? (
            <Card delay={60}>
              <p className="px-5 py-5 text-[13px] text-fg-2">出金紀錄沒讀到，暫時無法檢查每筆出金有沒有對上收入。</p>
            </Card>
          ) : cashout.data.length > 0 ? (
            <Card delay={60}>
              <UnreconciledNotice items={unreconciled} onReview={reviewCashout} onAddIncome={openManualEntry} />
            </Card>
          ) : null}

          <Card delay={120}>
            {addresses.status === 'loading' ? (
              <SidePanelSkeleton lines={4} />
            ) : addresses.status === 'error' ? (
              <p className="px-5 py-5 text-[13px] text-fg-2">入金地址暫時讀不到。</p>
            ) : (
              <DepositAddressPanel addresses={addresses.data} held={held} onCopy={copied} onAddAddress={addAddress} />
            )}
          </Card>

          <Card delay={180}>
            {sources.status === 'ready' ? (
              <SourcesPanel status={sources.data} onImportCsv={openImport} onManualEntry={openManualEntry} />
            ) : (
              <SidePanelSkeleton lines={3} />
            )}
          </Card>
        </div>

        <Card delay={120} className="overflow-hidden lg:col-start-1 lg:row-start-2">
          <LedgerTabs
            active={tab}
            onChange={setTab}
            counts={{
              income: income.status === 'ready' ? income.data.length : null,
              cashout: cashout.status === 'ready' ? cashout.data.length : null,
            }}
          />
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === 'income' ? (
              income.status === 'loading' ? (
                <LedgerSkeleton />
              ) : income.status === 'error' ? (
                <SectionError title="讀不到 MoonPay Commerce 的收款紀錄" error={income.error} onRetry={reloadIncome} />
              ) : (
                <IncomeLedger events={income.data} totalTwd={totals?.totalIncomeTwd ?? null} onManualEntry={openManualEntry} />
              )
            ) : cashout.status === 'loading' ? (
              <LedgerSkeleton />
            ) : cashout.status === 'error' ? (
              <SectionError title="讀不到 MAX 的出金紀錄" error={cashout.error} onRetry={reloadCashout} />
            ) : (
              <CashoutLedger
                events={cashout.data}
                totalTwd={totals?.totalCashoutTwd ?? null}
                expandedIds={expanded}
                onToggle={toggle}
                onImportCsv={openImport}
                onAddIncome={openManualEntry}
              />
            )}
          </div>
        </Card>
      </main>

      <Toast message={toast} />
    </div>
  )
}
