import { useState } from 'react'
import { ArrowRight, ArrowUpRight, CircleCheck, ExternalLink, Info, RotateCw, TriangleAlert } from 'lucide-react'
import type { Attribution, OutgoingTransfer, Receipt, ReceiptSource, ReceiptsView, ReceiptTotals } from '../../types/receipts'
import { formatDate, formatTime, formatTokenAmount } from '../../lib/format'
import { useResource } from '../../lib/useResource'
import { getReceipts } from '../../services/receipts'
import { Button, Card, Eyebrow, Money, NetworkBadge, SectionError, SkeletonBar } from '../../components/atoms'
import { href } from '../router'
import { useT, useTx, type T } from '../../i18n'
import { fxSourceText, sourceLabel, walletLimitText } from '../../lib/words'

const ALL = 'all'

const attribution = (t: T): Record<Attribution, { label: string; hint: string; cls: string }> => ({
  webhook: { label: t('MoonPay 通知', 'MoonPay notice'), hint: t('MoonPay 的 webhook 寫明是這個 Pay Link。', 'MoonPay’s webhook named this Pay Link.'), cls: 'border-success/20 bg-success-soft text-success' },
  'only-paylink': {
    label: t('推測', 'Guess'),
    hint: t('這個錢包只有這個 Pay Link 加進 MoonMax Book，金額也跟它的售價相符，所以推測是它。設定 webhook 就能確定。', 'It’s the only Pay Link added for this wallet and the amount matches its price, so it’s probably this one. A webhook makes it certain.'),
    cls: 'border-border bg-muted text-fg-2',
  },
  'price-match': {
    label: t('推測', 'Guess'),
    hint: t('金額跟這個 Pay Link 的售價相符，所以推測是它。設定 webhook 就能確定。', 'The amount matches this Pay Link’s price, so it’s probably this one. A webhook makes it certain.'),
    cls: 'border-border bg-muted text-fg-2',
  },
  unmatched: {
    label: t('分不出來', 'Unknown'),
    hint: t('確定是 MoonPay 的付款，但金額對不上任何加進來的 Pay Link。可能是還沒加進來的 Pay Link，或幾個 Pay Link 價格一樣。設定 webhook 就能分。', 'Definitely a MoonPay payment, but the amount matches none of your Pay Links — maybe one you haven’t added, or several share a price. A webhook sorts it out.'),
    cls: 'border-warn/25 bg-warn-soft text-warn',
  },
  'not-moonpay': { label: t('不是 MoonPay', 'Not MoonPay'), hint: t('直接轉進錢包的錢，不是透過 MoonPay 付款。不算進收入。', 'Sent straight to the wallet, not paid through MoonPay. Not counted as income.'), cls: 'border-border bg-muted text-fg-3' },
})

export function ReceiptsPage() {
  const t = useT()
  const [view, reload] = useResource(getReceipts, [])
  const [active, setActive] = useState<string>(ALL)

  return (
    <div className="mx-auto max-w-[1280px] px-5 pb-32 pt-8 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[680px]">
          <p className="text-[12.5px] font-medium tracking-[0.06em] text-primary-ink">{t('收款紀錄', 'Receipts')}</p>
          <h1 className="mt-1.5 text-[26px] font-semibold leading-tight tracking-[-0.035em] md:text-[30px]">{t('每個網站收了多少', 'What each site has earned')}</h1>
          <p className="mt-2 text-[14px] leading-[1.7] text-fg-3">
            {t(
              '直接從區塊鏈讀你的收款錢包，再用 MoonPay 的通知分出每筆屬於哪個 Pay Link。金額和時間以鏈上為準，不需要 API 金鑰。',
              'Read straight from your receiving wallets on the blockchain, with MoonPay’s notifications saying which Pay Link each payment belongs to. Amounts and times come from the chain — no API keys.',
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {view.status === 'ready' ? <span className="num text-[12px] text-fg-3">{t(`讀取時間 ${formatTime(view.data.checkedAt)}`, `Read at ${formatTime(view.data.checkedAt)}`)}</span> : null}
          <Button onClick={reload} disabled={view.status === 'loading'}>
            <RotateCw className={`size-4 ${view.status === 'loading' ? 'animate-spin' : ''}`} aria-hidden />
            {t('重新讀取', 'Refresh')}
          </Button>
        </div>
      </header>

      {view.status === 'loading' ? (
        <div className="mt-6 space-y-4" aria-busy aria-label={t('讀取中', 'Loading')}>
          <SkeletonBar className="h-10 w-2/3 rounded-lg" />
          <SkeletonBar className="h-[104px] rounded-xl" />
          <SkeletonBar className="h-[220px] rounded-xl" />
          <p className="text-[13px] text-fg-3">{t('正在讀區塊鏈和 MoonPay…第一次會比較久，之後有快取。', 'Reading the blockchain and MoonPay… slower the first time, cached after that.')}</p>
        </div>
      ) : view.status === 'error' ? (
        <Card className="mt-6">
          <SectionError title={t('收款紀錄讀不到', 'Couldn’t load receipts')} error={view.error} onRetry={reload} />
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
  const t = useT()
  return (
    <Card className="mt-6">
      <div className="px-6 py-10 text-center">
        <p className="text-[15px] font-semibold">{t('還沒有收款來源', 'No payment sources yet')}</p>
        <p className="mx-auto mt-1 max-w-[46ch] text-[13.5px] leading-[1.7] text-fg-3">
          {t('先在「開始使用」加入你的 Pay Link，MoonMax Book 才知道要讀哪個錢包。', 'Add your Pay Links in Get started first, so MoonMax Book knows which wallets to read.')}
        </p>
        <a
          href={href('#/')}
          className="focus-ring mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-medium text-primary-fg shadow-sheet transition-transform duration-150 hover:bg-primary-hover active:scale-[0.97]"
        >
          {t('去加入 Pay Link', 'Add a Pay Link')}
          <ArrowRight className="size-3.5" aria-hidden />
        </a>
      </div>
    </Card>
  )
}

function Loaded({ view, active, onSelect }: { view: ReceiptsView; active: string; onSelect: (key: string) => void }) {
  const t = useT()
  const tx = useTx()
  const source = view.sources.find((s) => s.key === active) ?? null
  const key = source ? source.key : ALL
  const rows = key === ALL ? view.receipts.filter((r) => r.sourceKey !== 'other') : view.receipts.filter((r) => r.sourceKey === key)
  const totals: ReceiptTotals = source ?? view.totals
  const labelOf = (k: string) => {
    const s = view.sources.find((x) => x.key === k)
    return s ? sourceLabel(t, s) : k
  }
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
            <span>
              {t(
                '標成「推測」或「分不出來」的，是設定 MoonPay 通知之前收的款，只能從錢包和金額推測。之後收的每一筆都會標上確定的 Pay Link。',
                'Payments marked “Guess” or “Unknown” arrived before notifications were set up, so they’re inferred from wallet and amount. Everything after that is tagged with its exact Pay Link.',
              )}
            </span>
          ) : (
            <span>
              {tx(
                <>
                  標成「推測」或「分不出來」的，是因為還沒設定 MoonPay 通知。
                  <a href={href('#/')} className="focus-ring ml-1 rounded font-medium text-fg underline decoration-primary decoration-2 underline-offset-[3px]">
                    到開始使用第 3 步設定
                  </a>
                  ，之後每筆都會標上確定的 Pay Link。
                </>,
                <>
                  Payments marked “Guess” or “Unknown” are that way because MoonPay notifications aren’t set up.{' '}
                  <a href={href('#/')} className="focus-ring rounded font-medium text-fg underline decoration-primary decoration-2 underline-offset-[3px]">
                    Set them up in step 3 of Get started
                  </a>{' '}
                  and every payment gets its exact Pay Link.
                </>,
              )}
            </span>
          )}
        </p>
      ) : null}

      <Card className="mt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-3.5">
          <h2 className="text-[15px] font-semibold">{source ? sourceLabel(t, source) : t('全部收款', 'All receipts')}</h2>
          <span className="text-[12px] text-fg-3">{t('台幣價值 = 買家付的 USDC × 收到當天的匯率', 'TWD value = USDC the buyer paid × that day’s rate')}</span>
        </div>
        {rows.length ? <ReceiptTable rows={rows} showSource={key === ALL} labelOf={labelOf} /> : <p className="px-5 py-10 text-center text-[13.5px] text-fg-3">{t('這個來源還沒有收款。', 'No payments from this source yet.')}</p>}
      </Card>

      {view.outgoing.length ? (
        <Card className="mt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-3.5">
            <h2 className="text-[15px] font-semibold">{t('轉出紀錄', 'Transfers out')}</h2>
            <span className="text-[12px] text-fg-3">{t('從收款錢包轉出去的 USDC。轉到 MAX 的，之後會跟 MAX 的出金紀錄對起來。', 'USDC sent out of your receiving wallets. Transfers to MAX will be matched with your MAX cash-outs.')}</span>
          </div>
          <OutgoingTable rows={view.outgoing} />
        </Card>
      ) : null}

      <Footnotes view={view} />
    </>
  )
}

function SourceTabs({ sources, totalCount, active, onSelect }: { sources: ReceiptSource[]; totalCount: number; active: string; onSelect: (key: string) => void }) {
  const t = useT()
  const tabs = [{ key: ALL, label: t('全部', 'All'), count: totalCount, muted: false }, ...sources.map((s) => ({ key: s.key, label: sourceLabel(t, s), count: s.count, muted: s.kind !== 'paylink' }))]
  return (
    <div role="tablist" aria-label={t('收款來源', 'Payment sources')} className="mt-6 flex gap-1.5 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const selected = tab.key === active
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(tab.key)}
            className={`focus-ring inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-[13.5px] transition-transform duration-150 active:scale-[0.97] ${
              selected ? 'border-fg bg-fg text-card' : `border-border bg-card shadow-sheet hover:bg-muted ${tab.muted ? 'text-fg-3' : 'text-fg'}`
            }`}
          >
            {tab.label}
            <span className={`num rounded px-1 text-[11.5px] ${selected ? 'bg-white/15 text-card' : 'bg-muted text-fg-3'}`}>{tab.count}</span>
          </button>
        )
      })}
    </div>
  )
}

function TotalsCard({ totals, source }: { totals: ReceiptTotals; source: ReceiptSource | null }) {
  const t = useT()
  // USDC and USDT are both counted as 1 USD; say which ones are in the sum.
  const unit = totals.tokens.length ? totals.tokens.join('＋') : 'USDC'
  const stats: { label: string; value: string; unit?: string; twd?: boolean }[] = [
    { label: t('筆數', 'Payments'), value: String(totals.count) },
    { label: t('買家付', 'Buyers paid'), value: formatTokenAmount(totals.grossTotalToken), unit },
    { label: t('MoonPay 手續費', 'MoonPay fees'), value: formatTokenAmount(totals.feeTotalToken), unit },
    { label: t('進到你錢包', 'Into your wallet'), value: formatTokenAmount(totals.netTotalToken), unit },
  ]
  return (
    <div className="animate-rise rounded-xl border border-border bg-card px-5 py-4 shadow-sheet">
      {source?.kind === 'paylink' ? (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border pb-3 text-[12.5px] text-fg-3">
          {source.paylinkName && source.paylinkName !== source.label ? <span>{t(`MoonPay 名稱：${source.paylinkName}`, `Name on MoonPay: ${source.paylinkName}`)}</span> : null}
          {source.siteUrl ? (
            <a href={source.siteUrl} target="_blank" rel="noreferrer" className="focus-ring inline-flex items-center gap-1 rounded font-mono text-fg-2 hover:text-fg">
              {source.siteUrl.replace(/^https?:\/\//, '')}
              <ArrowUpRight className="size-3" aria-hidden />
            </a>
          ) : null}
          {!source.registered ? <span className="text-warn">{t('MoonPay 通知裡出現的 Pay Link，還沒加進開始使用。', 'A Pay Link seen in MoonPay notifications that isn’t added in Get started yet.')}</span> : null}
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
          <dt className="text-[12.5px] text-fg-3">{t('台幣價值（參考）', 'TWD value (reference)')}</dt>
          <dd className="mt-0.5 text-[22px] font-semibold tracking-[-0.02em]">
            {totals.twdTotal !== null ? <Money value={totals.twdTotal} /> : <span className="text-[14px] font-normal text-fg-3">{t('匯率還沒取得', 'Rate not available yet')}</span>}
          </dd>
        </div>
      </dl>
    </div>
  )
}

const TH = 'py-2.5 text-left text-[12px] font-normal tracking-[0.04em] text-fg-3'
const TD = 'py-3 align-top'

function AttributionChip({ a }: { a: Attribution }) {
  const t = useT()
  const { label, hint, cls } = attribution(t)[a]
  return (
    <span title={hint} className={`inline-flex cursor-help rounded-md border px-1.5 text-[11.5px] leading-5 ${cls}`}>
      {label}
    </span>
  )
}

function UsdtChip() {
  const t = useT()
  return (
    <span
      title={t('收到的是 Solana 上的 USDT。MAX 公告的 Solana 入金只有 USDC，USDT 很可能不能直接轉進 MAX，要先換成 USDC。', 'This is USDT on Solana. MAX only lists USDC for Solana deposits, so you likely need to swap it to USDC before sending it to MAX.')}
      className="inline-flex cursor-help rounded-md border border-warn/25 bg-warn-soft px-1.5 text-[11.5px] leading-5 text-warn"
    >
      {t('USDT · MAX 可能不收', 'USDT · MAX may not accept')}
    </span>
  )
}

function TxLink({ url }: { url: string }) {
  const t = useT()
  if (!url) return <span className="text-fg-3">—</span>
  return (
    <a href={url} target="_blank" rel="noreferrer" className="focus-ring inline-flex items-center gap-1 rounded text-[12.5px] text-fg-2 hover:text-fg" aria-label={t('在區塊鏈瀏覽器打開這筆交易', 'Open this transaction in a block explorer')}>
      {t('鏈上紀錄', 'On chain')}
      <ExternalLink className="size-3" aria-hidden />
    </a>
  )
}

function ReceiptTable({ rows, showSource, labelOf }: { rows: Receipt[]; showSource: boolean; labelOf: (key: string) => string }) {
  const t = useT()
  return (
    <div className="px-4 pb-4 md:px-5">
      <table className="hidden w-full border-collapse text-[14px] md:table">
        <thead>
          <tr className="border-b border-border-strong">
            <th className={`${TH} w-[132px]`}>{t('收到時間（台北）', 'Received (Taipei)')}</th>
            <th className={TH}>{showSource ? t('來源', 'Source') : t('對應方式', 'Matched by')}</th>
            <th className={`${TH} w-[96px]`}>{t('網路', 'Network')}</th>
            <th className={`${TH} w-[104px] text-right`}>{t('買家付', 'Buyer paid')}</th>
            <th className={`${TH} w-[92px] text-right`}>{t('手續費', 'Fee')}</th>
            <th className={`${TH} w-[104px] text-right`}>{t('進到錢包', 'Received')}</th>
            <th className={`${TH} w-[120px] text-right`}>{t('台幣價值', 'TWD value')}</th>
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
                  {r.token === 'USDT' ? <UsdtChip /> : null}
                  {!r.verifiedOnChain ? (
                    <span
                      title={t('只有 MoonPay 通知，鏈上還沒核對到這筆交易', 'Only MoonPay’s notification so far — not yet checked on chain')}
                      className="inline-flex cursor-help rounded-md border border-warn/25 bg-warn-soft px-1.5 text-[11.5px] leading-5 text-warn"
                    >
                      {t('鏈上未核對', 'Not checked on chain')}
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
              {r.token === 'USDT' ? <UsdtChip /> : null}
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <span className="num text-[13px] text-fg-2">
                {formatTokenAmount(r.netToken)} {r.token}
                {r.feeToken ? <span className="text-fg-3">{t(`（手續費 ${formatTokenAmount(r.feeToken)}）`, ` (fee ${formatTokenAmount(r.feeToken)})`)}</span> : null}
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
  const t = useT()
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
              {t('轉到 MAX', 'To MAX')}
            </span>
          ) : (
            <span className="rounded-md border border-border bg-muted px-1.5 text-[11.5px] leading-5 text-fg-3">{t('轉到其他地址', 'To another address')}</span>
          )}
          <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-fg-3">{o.to ?? '—'}</span>
          <TxLink url={o.explorerUrl} />
        </li>
      ))}
    </ul>
  )
}

function Footnotes({ view }: { view: ReceiptsView }) {
  const t = useT()
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <Eyebrow>{t('這些數字怎麼來的', 'Where these numbers come from')}</Eyebrow>
        <ul className="mt-2.5 space-y-1.5 text-[12.5px] leading-[1.7] text-fg-2">
          <li>{t('金額、時間：Solana 區塊鏈上的交易紀錄，點「鏈上紀錄」可以自己核對。', 'Amounts and times: the transaction on the Solana blockchain — check it yourself via “On chain”.')}</li>
          <li>{t('手續費：同一筆交易裡分給 MoonPay 的部分。', 'Fee: the part of the same transaction that went to MoonPay.')}</li>
          <li>
            {t(
              `台幣價值：買家付的 USDC 或 USDT（都視為 1 美元）× 收到當天的美元兌台幣匯率。匯率來源：${fxSourceText(t)}。`,
              `TWD value: the USDC or USDT the buyer paid (each counted as US$1) × that day’s USD/TWD rate. Rate source: ${fxSourceText(t)}.`,
            )}
          </li>
        </ul>
      </div>
      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <Eyebrow>{t('讀了哪些錢包', 'Wallets read')}</Eyebrow>
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
                  <span className="text-fg-3">{walletLimitText(t, w.limit, w.chain)}</span>
                ) : (
                  <span className="text-fg-3">{t('已從鏈上讀取', 'Read from the chain')}</span>
                )}
              </span>
            </li>
          ))}
          {!view.wallets.length ? <li className="text-fg-3">{t('沒有收款錢包。', 'No receiving wallets.')}</li> : null}
        </ul>
      </div>
    </div>
  )
}
