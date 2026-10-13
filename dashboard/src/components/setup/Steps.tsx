import { useId, useState, type FormEvent } from 'react'
import { ArrowRight, CircleCheck, Copy, ExternalLink, LoaderCircle, Pencil, Plus, TriangleAlert, Upload, X } from 'lucide-react'
import type { PaylinkEntry, ReceivingWallet, SetupState } from '../../types/setup'
import type { ReceiptsView } from '../../types/receipts'
import { formatDateTime, formatTokenAmount } from '../../lib/format'
import { useResource } from '../../lib/useResource'
import { signedTwd, walletLimitText } from '../../lib/words'
import { getReceipts } from '../../services/receipts'
import { clearMaxImport, getRecon, importMaxCsv } from '../../services/max'
import { isDeployed } from '../../lib/runtime'
import { useT, useTx } from '../../i18n'
import { Button, NetworkBadge } from '../atoms'
import { Kbd, Tip, WhereToFind } from './StepShell'

const MOONPAY_DASHBOARD = 'https://moonpay.hel.io'
const MAX_URL = 'https://max.maicoin.com/'

function ExtLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="focus-ring inline-flex items-center gap-1 rounded font-medium text-fg underline decoration-primary decoration-2 underline-offset-[3px] hover:decoration-fg"
    >
      {children}
      <ExternalLink className="size-3.5" aria-hidden />
    </a>
  )
}

const INPUT =
  'h-10 min-w-0 rounded-lg border bg-card px-3 text-[13.5px] font-normal text-fg shadow-sheet outline-none placeholder:text-fg-3/70 focus-visible:border-fg/40 focus-visible:ring-2 focus-visible:ring-fg/10'

function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <p role="alert" className="flex items-start gap-1.5 text-[13px] leading-[1.6] text-danger-deep">
      <TriangleAlert className="mt-[3px] size-3.5 shrink-0" aria-hidden />
      {error}
    </p>
  )
}

function InlineForm({
  label,
  placeholder,
  submitLabel,
  busy,
  error,
  onSubmit,
  mono = true,
  secret = false,
}: {
  label: string
  placeholder: string
  submitLabel: string
  busy: boolean
  error: string | null
  onSubmit: (value: string) => void
  mono?: boolean
  secret?: boolean
}) {
  const [value, setValue] = useState('')
  const inputId = useId()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (value.trim()) onSubmit(value)
  }
  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor={inputId} className="block text-[13px] font-medium text-fg">
        {label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={inputId}
          type={secret ? 'password' : 'text'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={Boolean(error)}
          className={`${INPUT} flex-1 ${mono ? 'font-mono' : ''} ${error ? 'border-danger/50' : 'border-border'}`}
        />
        <Button type="submit" variant="primary" disabled={busy || !value.trim()}>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
          {submitLabel}
        </Button>
      </div>
      <ErrorLine error={error} />
    </form>
  )
}

const short = (a: string) => (a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a)

// ---------------------------------------------------------------------------
// Step 1 — Pay Links (one per site or product)

export function PaylinksStep({
  setup,
  busy,
  error,
  onAdd,
  onUpdate,
  onRemove,
}: {
  setup: SetupState
  busy: boolean
  error: string | null
  onAdd: (input: string, label: string) => void
  onUpdate: (id: string, patch: { label?: string | null; siteUrl?: string | null }) => void
  onRemove: (id: string) => void
}) {
  const t = useT()
  const tx = useTx()
  const [adding, setAdding] = useState(false)
  const has = setup.paylinks.length > 0
  return (
    <div className="space-y-4">
      {has ? (
        <ul className="space-y-2.5">
          {setup.paylinks.map((p) => (
            <PaylinkCard key={p.id} entry={p} busy={busy} onUpdate={(patch) => onUpdate(p.id, patch)} onRemove={() => onRemove(p.id)} />
          ))}
        </ul>
      ) : null}

      {!has || adding ? (
        <>
          <WhereToFind
            steps={tx(
              [
                <>
                  打開 <ExtLink href={MOONPAY_DASHBOARD}>MoonPay Commerce 後台</ExtLink>，進 <Kbd>Payments</Kbd>（付款連結）。
                </>,
                <>
                  點你要對帳的那個 Pay Link，複製付款網址：<span className="font-mono text-[12.5px] text-fg">moonpay.hel.io/pay/</span>
                  <span className="rounded bg-primary-soft px-1 font-mono text-[12.5px] text-primary-ink">24 個英文和數字</span>。
                </>,
                <>貼到下面，再取一個你認得的名字，例如網站或商品名稱。有幾個網站在收錢，就加幾個。</>,
              ],
              [
                <>
                  Open the <ExtLink href={MOONPAY_DASHBOARD}>MoonPay Commerce dashboard</ExtLink> and go to <Kbd>Payments</Kbd>.
                </>,
                <>
                  Click the Pay Link you want to track and copy its payment address: <span className="font-mono text-[12.5px] text-fg">moonpay.hel.io/pay/</span>
                  <span className="rounded bg-primary-soft px-1 font-mono text-[12.5px] text-primary-ink">24 letters and digits</span>.
                </>,
                <>Paste it below and give it a name you’ll recognise, like the site or product. Add one for every site that takes payments.</>,
              ],
            )}
          />
          <AddPaylinkForm busy={busy} error={error} onAdd={onAdd} onCancel={has ? () => setAdding(false) : undefined} />
          {!has ? (
            <Tip>
              {t(
                'Pay Link ID 是公開的，本來就寫在付款網址上，不是密碼。MoonMax Book 拿它去問 MoonPay：這個付款連結叫什麼、多少錢、錢會進哪個錢包。',
                'A Pay Link ID is public — it’s right there in the payment address, not a password. MoonMax Book uses it to ask MoonPay what the link is called, what it costs and which wallet the money goes to.',
              )}
            </Tip>
          ) : null}
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-[14px]" aria-hidden />
            {t('再加一個 Pay Link', 'Add another Pay Link')}
          </Button>
          <span className="text-[12.5px] text-fg-3">{t('每個網站或商品各用一個 Pay Link，帳本就能分開列。', 'One Pay Link per site or product keeps them apart in the ledger.')}</span>
        </div>
      )}
    </div>
  )
}

function AddPaylinkForm({ busy, error, onAdd, onCancel }: { busy: boolean; error: string | null; onAdd: (input: string, label: string) => void; onCancel?: () => void }) {
  const t = useT()
  const [input, setInput] = useState('')
  const [label, setLabel] = useState('')
  const idA = useId()
  const idB = useId()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (input.trim()) onAdd(input, label)
  }
  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-border bg-card p-3.5">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-1.5">
          <label htmlFor={idA} className="block text-[13px] font-medium text-fg">
            {t('Pay Link 付款網址或 ID', 'Pay Link address or ID')}
          </label>
          <input
            id={idA}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="moonpay.hel.io/pay/…"
            spellCheck={false}
            autoComplete="off"
            aria-invalid={Boolean(error)}
            className={`${INPUT} w-full font-mono ${error ? 'border-danger/50' : 'border-border'}`}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={idB} className="block text-[13px] font-medium text-fg">
            {t('名稱', 'Name')} <span className="font-normal text-fg-3">{t('（選填）', '(optional)')}</span>
          </label>
          <input
            id={idB}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t('例如：Frame to Lottie 外掛', 'e.g. Frame to Lottie plugin')}
            maxLength={40}
            className={`${INPUT} w-full border-border`}
          />
        </div>
      </div>
      <ErrorLine error={error} />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={busy || !input.trim()}>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
          {t('加入', 'Add')}
        </Button>
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel}>
            {t('取消', 'Cancel')}
          </Button>
        ) : null}
      </div>
    </form>
  )
}

function PaylinkCard({ entry, busy, onUpdate, onRemove }: { entry: PaylinkEntry; busy: boolean; onUpdate: (patch: { label?: string | null; siteUrl?: string | null }) => void; onRemove: () => void }) {
  const t = useT()
  const [editing, setEditing] = useState(false)
  const pl = entry.preview
  const title = entry.label ?? pl?.name ?? entry.id
  return (
    <li className={`rounded-lg border px-4 py-3.5 ${pl ? 'border-border bg-card' : 'border-danger/25 bg-danger-soft/40'}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[14.5px] font-semibold text-fg">
            {pl ? <CircleCheck className="size-4 shrink-0 text-success" aria-hidden /> : <TriangleAlert className="size-4 shrink-0 text-danger" aria-hidden />}
            {title}
          </p>
          {pl && entry.label ? <p className="mt-0.5 pl-6 text-[12.5px] text-fg-3">{t(`MoonPay 上的名稱：${pl.name}`, `Name on MoonPay: ${pl.name}`)}</p> : null}
        </div>
        {pl ? (
          <p className="num text-[15px] font-semibold">
            {pl.priceToken} <span className="text-[12px] font-medium text-fg-3">{pl.token}</span>
          </p>
        ) : null}
      </div>

      {pl ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-6">
          <span className={`rounded-md border px-1.5 text-[11.5px] leading-5 ${pl.active ? 'border-success/20 bg-success-soft text-success' : 'border-danger/20 bg-danger-soft text-danger-deep'}`}>
            {pl.active ? t('啟用中', 'Active') : t('已停用', 'Disabled')}
          </span>
          {pl.recipients.map((r) => {
            const usdtOnSolana = r.engine === 'SOL' && r.token === 'USDT'
            return (
              <span
                key={`${r.address}-${r.token}`}
                title={
                  usdtOnSolana
                    ? t('MAX 公告的 Solana 入金只有 USDC。買家付 USDT 的話，你收到的 USDT 很可能不能直接轉進 MAX。', 'MAX only lists USDC for Solana deposits. If a buyer pays in USDT, you likely can’t send it straight to MAX.')
                    : undefined
                }
                className={`inline-flex items-center gap-1 rounded-md border px-1.5 text-[11.5px] leading-5 ${usdtOnSolana ? 'border-warn/25 bg-warn-soft text-warn' : 'border-border bg-muted text-fg-2'}`}
              >
                {t(`收 ${r.chain} ${r.token} →`, `${r.chain} ${r.token} →`)} <span className="font-mono">{short(r.address)}</span>
                {usdtOnSolana ? t('（MAX 可能不收）', ' (MAX may not accept)') : null}
              </span>
            )
          })}
          {pl.canSwapTokens ? <span className="rounded-md border border-border bg-muted px-1.5 text-[11.5px] leading-5 text-fg-3">{t('可用其他幣付', 'Other coins accepted')}</span> : null}
          {!pl.requireEmail ? <span className="rounded-md border border-warn/25 bg-warn-soft px-1.5 text-[11.5px] leading-5 text-warn">{t('沒收 Email', 'No email collected')}</span> : null}
        </div>
      ) : (
        <p className="mt-1 pl-6 text-[13px] text-danger-deep">{entry.error}</p>
      )}

      {entry.siteUrl && !editing ? (
        <p className="mt-1.5 pl-6 text-[12.5px] text-fg-3">
          {t('網站：', 'Site: ')}
          <a href={entry.siteUrl} target="_blank" rel="noreferrer" className="focus-ring rounded font-mono text-fg-2 hover:text-fg">
            {entry.siteUrl.replace(/^https?:\/\//, '')}
          </a>
        </p>
      ) : null}

      {editing ? (
        <EditPaylink
          entry={entry}
          busy={busy}
          onSave={(patch) => {
            onUpdate(patch)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="mt-2.5 flex flex-wrap gap-1 pl-5">
          {pl?.hostedUrl ? (
            <a
              href={pl.hostedUrl}
              target="_blank"
              rel="noreferrer"
              className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] text-fg-2 transition-transform duration-150 hover:bg-muted hover:text-fg active:scale-[0.97]"
            >
              {t('付款頁', 'Payment page')}
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} disabled={busy}>
            <Pencil className="size-[13px]" aria-hidden />
            {t('名稱與網站', 'Name & site')}
          </Button>
          <Button size="sm" variant="ghost" onClick={onRemove} disabled={busy}>
            <X className="size-[14px]" aria-hidden />
            {t('移除', 'Remove')}
          </Button>
        </div>
      )}
    </li>
  )
}

function EditPaylink({ entry, busy, onSave, onCancel }: { entry: PaylinkEntry; busy: boolean; onSave: (patch: { label: string | null; siteUrl: string | null }) => void; onCancel: () => void }) {
  const t = useT()
  const [label, setLabel] = useState(entry.label ?? '')
  const [site, setSite] = useState(entry.siteUrl ?? '')
  const idA = useId()
  const idB = useId()
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ label: label.trim() || null, siteUrl: site.trim() || null })
      }}
      className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2"
    >
      <div className="space-y-1.5">
        <label htmlFor={idA} className="block text-[12.5px] font-medium text-fg">
          {t('名稱', 'Name')}
        </label>
        <input id={idA} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={entry.preview?.name ?? ''} maxLength={40} className={`${INPUT} w-full border-border`} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={idB} className="block text-[12.5px] font-medium text-fg">
          {t('放這個按鈕的網站', 'Site with this button')} <span className="font-normal text-fg-3">{t('（選填）', '(optional)')}</span>
        </label>
        <input id={idB} value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://" spellCheck={false} className={`${INPUT} w-full border-border font-mono`} />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="sm" variant="primary" disabled={busy}>
          {t('儲存', 'Save')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {t('取消', 'Cancel')}
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — receiving wallets, read from the public chain (C)

export function WalletsStep({ setup, open }: { setup: SetupState; open: boolean }) {
  const t = useT()
  const tx = useTx()
  if (!setup.wallets.length) {
    return <p className="text-[13.5px] text-fg-3">{t('先完成第 1 步。加入 Pay Link 之後，它要把錢送進哪個錢包，這裡會自動列出來。', 'Finish step 1 first. Once a Pay Link is added, the wallet it pays into shows up here.')}</p>
  }
  return (
    <div className="space-y-4">
      <p className="text-[13.5px] leading-[1.7] text-fg-2">
        {tx(
          <>
            每個 Pay Link 的設定裡都寫著錢要進哪個錢包。錢包地址和交易本來就公開在區塊鏈上，MoonMax Book 直接讀，
            <strong className="font-medium text-fg">不需要 API 金鑰，也不用登入 MoonPay。</strong>
          </>,
          <>
            Every Pay Link says which wallet its money goes to. Wallet addresses and transactions are public on the blockchain, so MoonMax Book reads them directly —{' '}
            <strong className="font-medium text-fg">no API keys, no MoonPay login.</strong>
          </>,
        )}
      </p>
      {open ? <WalletReads setup={setup} /> : null}
    </div>
  )
}

function WalletReads({ setup }: { setup: SetupState }) {
  const t = useT()
  const [view] = useResource(getReceipts, [setup.paylinks.map((p) => p.id).join()])
  const nameOf = (id: string) => {
    const p = setup.paylinks.find((x) => x.id === id)
    return p?.label ?? p?.preview?.name ?? id
  }
  return (
    <ul className="space-y-2.5">
      {setup.wallets.map((w) => (
        <li key={w.address} className="rounded-lg border border-border bg-card px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <NetworkBadge chain={w.chain} />
            <span className="min-w-0 break-all font-mono text-[12.5px] text-fg">{w.address}</span>
          </div>
          <p className="mt-1.5 text-[12.5px] text-fg-3">
            {w.paylinkIds.length > 1 ? t(`${w.paylinkIds.length} 個 Pay Link 共用：`, `Shared by ${w.paylinkIds.length} Pay Links: `) : 'Pay Link: '}
            {w.paylinkIds.map(nameOf).join(t('、', ', '))}
          </p>
          <WalletStatus wallet={w} view={view.status === 'ready' ? view.data : null} loading={view.status === 'loading'} error={view.status === 'error' ? view.error.message : null} />
          {w.paylinkIds.length > 1 && !setup.webhook.configured ? (
            <p className="mt-2 rounded-md bg-warn-soft px-2.5 py-1.5 text-[12.5px] leading-[1.6] text-fg-2">
              {t(
                '幾個 Pay Link 共用同一個錢包時，光看區塊鏈分不出錢是從哪個網站來的。做第 3 步，讓 MoonPay 每筆都通知你。',
                'When Pay Links share a wallet, the blockchain alone can’t tell which site a payment came from. Do step 3 so MoonPay tells you for every payment.',
              )}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function WalletStatus({ wallet, view, loading, error }: { wallet: ReceivingWallet; view: ReceiptsView | null; loading: boolean; error: string | null }) {
  const t = useT()
  if (!wallet.readable) return <p className="mt-2 text-[12.5px] leading-[1.6] text-fg-3">{walletLimitText(t, wallet.limit, wallet.chain)}</p>
  if (loading) {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-fg-3">
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
        {t('正在讀區塊鏈…第一次會比較久', 'Reading the blockchain… the first time takes longer')}
      </p>
    )
  }
  const read = view?.wallets.find((r) => r.address === wallet.address)
  const err = error ?? read?.error ?? null
  if (err) return <p className="mt-2 text-[12.5px] text-danger-deep">{t(`讀不到：${err}`, `Couldn’t read: ${err}`)}</p>
  const mine = view?.receipts.filter((r) => r.wallet === wallet.address) ?? []
  const latest = mine[0]
  const latestText = latest ? `${formatDateTime(latest.receivedAt)} · ${formatTokenAmount(latest.netToken)} ${latest.token}` : ''
  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
      <p className="flex items-center gap-1.5 text-[12.5px] text-fg-2">
        <CircleCheck className="size-3.5 text-success" aria-hidden />
        {mine.length
          ? t(`鏈上讀到 ${mine.length} 筆收款，最近一筆 ${latestText}`, `${mine.length} payment${mine.length > 1 ? 's' : ''} found on chain; latest ${latestText}`)
          : t('讀得到，目前還沒有收款', 'Readable — no payments yet')}
      </p>
      {mine.length ? (
        <a href="#/receipts" className="focus-ring inline-flex items-center gap-1 rounded text-[12.5px] font-medium text-fg underline decoration-primary decoration-2 underline-offset-[3px]">
          {t('看收款紀錄', 'See receipts')}
          <ArrowRight className="size-3" aria-hidden />
        </a>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — MoonPay webhook (B): tells us which Pay Link each payment came from

function CopyField({ value, label }: { value: string; label: string }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  return (
    <div>
      <p className="text-[12.5px] font-medium text-fg">{label}</p>
      <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-border bg-muted/60 py-1 pl-3 pr-1">
        <span className="min-w-0 flex-1 break-all font-mono text-[12.5px] text-fg">{value}</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            void navigator.clipboard?.writeText(value).then(() => {
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1600)
            })
          }}
          aria-label={t(`複製${label}`, `Copy ${label}`)}
        >
          {copied ? <CircleCheck className="size-[14px] text-success" aria-hidden /> : <Copy className="size-[14px]" aria-hidden />}
          {copied ? t('已複製', 'Copied') : t('複製', 'Copy')}
        </Button>
      </div>
    </div>
  )
}

export function WebhookStep({ setup, busy, error, onSave, onClear }: { setup: SetupState; busy: boolean; error: string | null; onSave: (token: string) => void; onClear: () => void }) {
  const t = useT()
  const tx = useTx()
  const wh = setup.webhook
  const hookUrl = `${window.location.origin}${wh.hookPath}`
  if (wh.configured) {
    const last = wh.lastEventAt ? formatDateTime(wh.lastEventAt) : ''
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-success/25 bg-success-soft/50 px-4 py-3">
          <p className="flex items-center gap-2 text-[14px] font-semibold">
            <CircleCheck className="size-[18px] text-success" aria-hidden />
            {t('MoonPay 的 Secret 已存好', 'MoonPay Secret saved')}
          </p>
          <p className="mt-1 pl-[26px] text-[12.5px] leading-[1.7] text-fg-2">
            {t('結尾', 'Ends in')} <span className="font-mono">••••{wh.tokenHint}</span> ·{' '}
            {wh.eventCount
              ? t(`收到 ${wh.eventCount} 則通知，最近一則 ${last}`, `${wh.eventCount} notification${wh.eventCount > 1 ? 's' : ''} received; latest ${last}`)
              : t('還沒收到通知', 'No notifications yet')}
          </p>
        </div>
        {!wh.eventCount ? <LocalhostNote hookUrl={hookUrl} /> : null}
        <Button size="sm" variant="ghost" onClick={onClear} disabled={busy}>
          <X className="size-[14px]" aria-hidden />
          {t('清除 Secret', 'Clear Secret')}
        </Button>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <p className="text-[13.5px] leading-[1.7] text-fg-2">
        {t(
          '區塊鏈上看得到「收了多少」，但看不到「是哪個網站賣的」。設定 webhook 之後，MoonPay 每收一筆就通知 MoonMax Book，裡面寫著是哪個 Pay Link。只有一個 Pay Link 的話可以先跳過。',
          'The blockchain shows how much came in, not which site sold it. With a webhook, MoonPay tells MoonMax Book about every payment, including its Pay Link. With only one Pay Link you can skip this for now.',
        )}
      </p>
      <WhereToFind
        title={t('在 MoonPay 後台這樣設（以 2026-10 的畫面為準）', 'Set it up in the MoonPay dashboard (as of October 2026)')}
        steps={tx(
          [
            <>
              在 <ExtLink href={MOONPAY_DASHBOARD}>MoonPay Commerce 後台</ExtLink> 左邊點 <Kbd>Developer</Kbd>，上面停在 <Kbd>Endpoints</Kbd> 分頁，按右邊的 <Kbd>Add Endpoint</Kbd>。
            </>,
            <>
              <Kbd>Name</Kbd> 隨便取，例如 MoonMax Book。
            </>,
            <>
              <Kbd>Secret</Kbd> 已經幫你產生好了：按欄位右邊的複製鈕，<strong className="font-medium text-fg">先貼到最下面存起來</strong>，按下 Add Endpoint 之後可能就看不到完整的了。
            </>,
            <>
              <Kbd>Endpoint URL</Kbd> 填下面的 Webhook 網址。
            </>,
            <>
              <Kbd>Webhook</Kbd> 選 <Kbd>Pay Link</Kbd>，<Kbd>Pay Link</Kbd> 選 <Kbd>All Pay Links</Kbd>（之後新增的也會涵蓋），按 <Kbd>Add Endpoint</Kbd>。
            </>,
            <>
              之後在 <Kbd>Events</Kbd> 分頁可以看到每則通知有沒有送成功。
            </>,
          ],
          [
            <>
              In the <ExtLink href={MOONPAY_DASHBOARD}>MoonPay Commerce dashboard</ExtLink>, click <Kbd>Developer</Kbd> on the left, stay on the <Kbd>Endpoints</Kbd> tab and click <Kbd>Add Endpoint</Kbd>.
            </>,
            <>
              <Kbd>Name</Kbd>: anything, e.g. MoonMax Book.
            </>,
            <>
              <Kbd>Secret</Kbd> is already generated: use the copy button next to it and <strong className="font-medium text-fg">paste it at the bottom of this step first</strong> — after Add Endpoint you may not see all of it again.
            </>,
            <>
              <Kbd>Endpoint URL</Kbd>: the webhook address below.
            </>,
            <>
              <Kbd>Webhook</Kbd>: <Kbd>Pay Link</Kbd>; <Kbd>Pay Link</Kbd>: <Kbd>All Pay Links</Kbd> (covers ones you add later). Then <Kbd>Add Endpoint</Kbd>.
            </>,
            <>
              The <Kbd>Events</Kbd> tab then shows whether each notification was delivered.
            </>,
          ],
        )}
      />
      <CopyField label={t('Webhook 網址', 'Webhook address')} value={hookUrl} />
      <LocalhostNote hookUrl={hookUrl} />
      <InlineForm
        label={t('貼上 MoonPay 的 Secret', 'Paste the MoonPay Secret')}
        placeholder={t('Add Endpoint 表單裡的 Secret', 'The Secret from the Add Endpoint form')}
        submitLabel={t('儲存', 'Save')}
        busy={busy}
        error={error}
        onSubmit={onSave}
        secret
      />
      <Tip>
        {tx(
          <>
            這個 Secret 只能用來確認「這則通知真的是 MoonPay 送的」，不能動你的帳戶或錢。
            {isDeployed() ? '它存在這個 MoonMax Book 專用的私人儲存空間（Vercel Blob，設成 private）' : <>它存在你電腦的 <span className="font-mono text-[12px]">data/webhook.local.json</span></>}
            ，畫面只顯示最後 4 碼。通知裡的買家 Email、姓名、地址，MoonMax Book 收到就丟掉，只留金額、時間、交易編號和 Pay Link。
          </>,
          <>
            The Secret only proves a notification really came from MoonPay — it can’t touch your account or money.{' '}
            {isDeployed() ? 'It’s kept in this MoonMax Book’s private storage (a private Vercel Blob store)' : <>It’s kept on your computer in <span className="font-mono text-[12px]">data/webhook.local.json</span></>}
            , and the page only shows its last 4 characters. Buyer email, name and address in notifications are thrown away on arrival; only amount, time, transaction ID and Pay Link are kept.
          </>,
        )}
      </Tip>
    </div>
  )
}

function LocalhostNote({ hookUrl }: { hookUrl: string }) {
  const tx = useTx()
  if (!/\/\/(localhost|127\.0\.0\.1)/.test(hookUrl)) return null
  const code = (s: string) => <code className="mx-0.5 rounded bg-card px-1.5 py-0.5 font-mono text-[12px] text-fg">{s}</code>
  return (
    <Tip tone="warn">
      {tx(
        <>
          上面是你電腦上的網址，MoonPay 從網路上連不到，填進去也收不到通知。部署到 Vercel 的版本會顯示固定的公開網址，用那個就好。只想在本機試的話：先裝 {code('brew install cloudflared')}，再跑 {code('cloudflared tunnel --url http://localhost:5173')}
          ，把它給你的 <span className="font-mono text-[12px]">https://….trycloudflare.com</span> 後面加上 <span className="font-mono text-[12px]">/api/hook/moonpay</span> 填進 Endpoint URL。這種臨時網址每次重開都會變，變了要回 MoonPay 改。透過它，外面只碰得到 webhook，碰不到其他頁面。
        </>,
        <>
          That’s an address on your own computer — MoonPay can’t reach it, so nothing would arrive. The version deployed on Vercel shows a fixed public address; use that one. To try it locally anyway: install {code('brew install cloudflared')}, run {code('cloudflared tunnel --url http://localhost:5173')}, and put the{' '}
          <span className="font-mono text-[12px]">https://….trycloudflare.com</span> address it gives you plus <span className="font-mono text-[12px]">/api/hook/moonpay</span> into Endpoint URL. That temporary address changes every restart. Through it, only the webhook is reachable — nothing else.
        </>,
      )}
    </Tip>
  )
}

// ---------------------------------------------------------------------------
// Step 4 — MAX deposit address

export function MaxAddressStep({ setup, busy, error, onSave, onClear }: { setup: SetupState; busy: boolean; error: string | null; onSave: (v: string) => void; onClear: () => void }) {
  const t = useT()
  const tx = useTx()
  const current = setup.maxDepositAddresses.find((a) => a.chain === 'solana')
  if (current) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
          <p className="text-[12.5px] text-fg-3">{t('MAX 的 USDC 入金地址（Solana 網路）', 'MAX USDC deposit address (Solana network)')}</p>
          <p className="mt-1 break-all font-mono text-[13px] text-fg">{current.address}</p>
        </div>
        <Tip tone="warn">
          {t(
            '只能轉 Solana 網路的 USDC 到這個地址。第一次先轉 1–2 USDC 測試，確認 MAX 有入帳再轉剩下的。轉到這裡的錢，收款紀錄會標成「轉到 MAX」。',
            'Only send USDC on the Solana network to this address. Send 1–2 USDC first and check it arrives on MAX before sending the rest. Transfers here show as “To MAX” in your receipts.',
          )}
        </Tip>
        <Button size="sm" variant="ghost" onClick={onClear} disabled={busy}>
          <X className="size-[14px]" aria-hidden />
          {t('換一個地址', 'Change address')}
        </Button>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <WhereToFind
        steps={tx(
          [
            <>
              登入 <ExtLink href={MAX_URL}>MAX</ExtLink>，先完成 Lv.1 身分驗證和 Lv.2 銀行驗證（綁你本人名下的帳戶）。
            </>,
            <>
              到 <Kbd>錢包</Kbd> → <Kbd>USDC</Kbd> → <Kbd>入金</Kbd>。
            </>,
            <>
              <strong className="font-medium text-fg">網路選 Solana</strong>，複製地址。同一個幣在不同網路地址不同，別拿錯。
            </>,
          ],
          [
            <>
              Sign in to <ExtLink href={MAX_URL}>MAX</ExtLink> and finish Lv.1 identity and Lv.2 bank verification (an account in your own name).
            </>,
            <>
              Go to <Kbd>錢包 Wallet</Kbd> → <Kbd>USDC</Kbd> → <Kbd>入金 Deposit</Kbd>.
            </>,
            <>
              <strong className="font-medium text-fg">Choose the Solana network</strong> and copy the address. The same coin has a different address on each network — don’t mix them up.
            </>,
          ],
        )}
      />
      <InlineForm
        label={t('MAX 的 Solana USDC 入金地址', 'MAX Solana USDC deposit address')}
        placeholder={t('貼上 Solana 地址', 'Paste a Solana address')}
        submitLabel={t('儲存', 'Save')}
        busy={busy}
        error={error}
        onSubmit={onSave}
      />
      <Tip>{t('MoonMax Book 會把轉到這個地址的錢標成「轉到 MAX」，之後對出金紀錄用。', 'MoonMax Book marks transfers to this address as “To MAX”, to match them with your cash-outs later.')}</Tip>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 5 — MAX CSV: match deposits to MoonPay income, flag extra transfers

export function MaxImportStep({ setup, onChanged, onUseAddress }: { setup: SetupState; onChanged: () => void; onUseAddress: (address: string) => void }) {
  const t = useT()
  const tx = useTx()
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const [results, setResults] = useState<{ name: string; ok: boolean; text: string }[]>([])
  const inputId = useId()
  const [recon] = useResource(getRecon, [setup.maxImport.records, setup.paylinks.length])

  const handle = async (files: File[]) => {
    if (!files.length || setup.sample) return
    setBusy(true)
    const out: { name: string; ok: boolean; text: string }[] = []
    for (const f of files) {
      if (/\.zip$/i.test(f.name)) {
        out.push({ name: f.name, ok: false, text: t('這是 zip。MAX 匯出的 zip 有密碼，先解壓縮，再上傳裡面的 CSV。', 'This is a zip. MAX’s exports are password-protected — unzip it first, then upload the CSV inside.') })
        continue
      }
      try {
        const r = await importMaxCsv(f.name, await f.text())
        out.push({
          name: f.name,
          ok: true,
          text: t(`匯入 ${r.added} 筆${r.duplicates ? `，略過重複的 ${r.duplicates} 筆` : ''}${r.skipped ? `，看不懂的 ${r.skipped} 列跳過` : ''}`, `${r.added} added${r.duplicates ? `, ${r.duplicates} duplicates skipped` : ''}${r.skipped ? `, ${r.skipped} unreadable rows skipped` : ''}`),
        })
      } catch (e) {
        out.push({ name: f.name, ok: false, text: e instanceof Error ? e.message : String(e) })
      }
    }
    setResults(out)
    setBusy(false)
    onChanged()
  }

  const clear = async () => {
    setBusy(true)
    await clearMaxImport().catch(() => null)
    setResults([])
    setBusy(false)
    onChanged()
  }

  const view = recon.status === 'ready' ? recon.data : null
  const detected = view && !view.maxAddressSet ? view.detectedMaxAddresses[0] : undefined

  return (
    <div className="space-y-4">
      <p className="text-[13.5px] leading-[1.7] text-fg-2">
        {t(
          '把 MAX 匯出的資金紀錄放進來。每筆入金會用交易編號回鏈上核對：從收款錢包轉進去的 USDC 對到你的 MoonPay 收入、算出匯率差；你另外轉進去的（例如 SOL，或比收入多的 USDC）會標成「額外轉入」。',
          'Bring in MAX’s funds-history export. Each deposit is checked on chain by its transaction ID: USDC from your receiving wallets is matched to your MoonPay income with its exchange-rate difference, and anything you sent yourself (like SOL, or more USDC than you earned) is marked as an extra transfer.',
        )}
      </p>
      <WhereToFind
        steps={tx(
          [
            <>
              在 <ExtLink href={MAX_URL}>MAX</ExtLink> 網頁版匯出<strong className="font-medium text-fg">資金紀錄</strong>（Funds history），檔名長得像 <span className="font-mono text-[12.5px] text-fg">funds_history_….csv</span>。選單名稱以 MAX 為準。
            </>,
            <>MAX 給的是有密碼的 zip，先解壓縮。</>,
            <>把 CSV 拖進下面的框，或點框選檔。可以一次選好幾個，重複的紀錄會自動略過。</>,
          ],
          [
            <>
              On <ExtLink href={MAX_URL}>MAX</ExtLink>’s website, export your <strong className="font-medium text-fg">funds history</strong> — the file looks like <span className="font-mono text-[12.5px] text-fg">funds_history_….csv</span>. Menu names may differ.
            </>,
            <>MAX sends a password-protected zip — unzip it first.</>,
            <>Drop the CSV into the box below, or click the box to choose it. Several at once is fine; duplicate rows are skipped.</>,
          ],
        )}
      />

      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          void handle([...e.dataTransfer.files])
        }}
        className={`focus-within:ring-2 focus-within:ring-fg/10 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-5 py-6 text-center transition-transform duration-150 active:scale-[0.99] ${
          drag ? 'border-fg/50 bg-muted' : 'border-border-strong bg-card hover:bg-muted/60'
        }`}
      >
        {busy ? <LoaderCircle className="size-6 animate-spin text-fg-3" aria-hidden /> : <Upload className="size-6 text-fg-3" aria-hidden />}
        <span className="text-[14px] font-medium text-fg">{t('拖進 MAX 的 CSV，或按這裡選擇', 'Drop MAX CSVs here, or click to choose')}</span>
        <span className="text-[12.5px] text-fg-3">{t('只讀檔案內容，不需要 MAX 帳號密碼', 'Only the file is read — no MAX login needed')}</span>
        <input
          id={inputId}
          type="file"
          accept=".csv,text/csv"
          multiple
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            void handle([...(e.target.files ?? [])])
            e.target.value = ''
          }}
        />
      </label>

      {results.length ? (
        <ul className="space-y-1.5">
          {results.map((r) => (
            <li key={r.name} className={`flex items-start gap-2 text-[13px] leading-[1.6] ${r.ok ? 'text-fg-2' : 'text-danger-deep'}`}>
              {r.ok ? <CircleCheck className="mt-[3px] size-3.5 shrink-0 text-success" aria-hidden /> : <TriangleAlert className="mt-[3px] size-3.5 shrink-0" aria-hidden />}
              <span>
                <span className="font-mono text-[12px]">{r.name}</span> · {r.text}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {view && view.rows.length ? (
        <div className="rounded-lg border border-border bg-background p-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
            <div>
              <dt className="text-[12px] text-fg-3">{t('對到 MoonPay 收入', 'Matched to MoonPay income')}</dt>
              <dd className="num text-[17px] font-semibold">
                {formatTokenAmount(view.totals.matchedToken)} <span className="text-[11.5px] font-medium text-fg-3">USDC</span>
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-fg-3">{t('收到時的台幣', 'TWD when received')}</dt>
              <dd className="num text-[17px] font-semibold">NT${view.totals.costTwd}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-fg-3">{t('入金當天的台幣', 'TWD on deposit day')}</dt>
              <dd className="num text-[17px] font-semibold">{view.totals.valueTwd ? `NT$${view.totals.valueTwd}` : '—'}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-fg-3">{t('匯率差', 'Exchange-rate difference')}</dt>
              <dd className="num text-[17px] font-semibold">{view.totals.fxDiffTwd ? signedTwd(view.totals.fxDiffTwd) : '—'}</dd>
            </div>
          </dl>
          {view.totals.extras.length ? (
            <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[12.5px] text-fg-2">
              <span className="rounded-md border border-warn/25 bg-warn-soft px-1.5 leading-5 text-warn">{t('額外轉入', 'Extra transfers')}</span>
              {view.totals.extras.map((x) => `${x.amount} ${x.currency}`).join(t('、', ', '))}
              <span className="text-fg-3">{t('— 不是 MoonPay 收入，不算進對帳', '— not MoonPay income, kept out of the match')}</span>
            </p>
          ) : null}
          {view.remainingIncome.length ? (
            <p className="mt-1.5 text-[12.5px] text-fg-3">
              {t(
                `還在收款錢包、沒轉到 MAX 的收入：${view.remainingIncome.map((r) => `${r.amount} ${r.token}`).join('、')}`,
                `Income still in your receiving wallets: ${view.remainingIncome.map((r) => `${r.amount} ${r.token}`).join(', ')}`,
              )}
            </p>
          ) : null}
          <a href="#/receipts" className="focus-ring mt-3 inline-flex items-center gap-1 rounded text-[13px] font-medium text-fg underline decoration-primary decoration-2 underline-offset-[3px]">
            {t('看每一筆的對帳', 'See each deposit’s match')}
            <ArrowRight className="size-3.5" aria-hidden />
          </a>
        </div>
      ) : null}

      {detected ? (
        <Tip>
          <span className="flex flex-wrap items-center gap-2">
            {t('從 MAX 紀錄看到你的 Solana 入金地址是', 'Your MAX records show your Solana deposit address is')} <span className="font-mono text-[12px] text-fg">{short(detected)}</span>
            <Button size="sm" onClick={() => onUseAddress(detected)}>
              {t('設成 MAX 入金地址', 'Use as MAX deposit address')}
            </Button>
          </span>
        </Tip>
      ) : null}

      {setup.maxImport.records ? (
        <Button size="sm" variant="ghost" onClick={clear} disabled={busy}>
          <X className="size-[14px]" aria-hidden />
          {t(`清除匯入的 MAX 紀錄（${setup.maxImport.records} 筆）`, `Clear imported MAX records (${setup.maxImport.records})`)}
        </Button>
      ) : null}
    </div>
  )
}
