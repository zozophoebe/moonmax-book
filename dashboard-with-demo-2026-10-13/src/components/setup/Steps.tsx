import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowRight, CircleCheck, Copy, ExternalLink, LoaderCircle, Pencil, Plus, TriangleAlert, X } from 'lucide-react'
import type { PaylinkEntry, ReceivingWallet, SetupState } from '../../types/setup'
import type { ReceiptsView } from '../../types/receipts'
import { formatDateTime, formatTokenAmount } from '../../lib/format'
import { useResource } from '../../lib/useResource'
import { getReceipts } from '../../services/receipts'
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
            steps={[
              <>
                打開 <ExtLink href={MOONPAY_DASHBOARD}>MoonPay Commerce 後台</ExtLink>，進 <Kbd>Pay Links</Kbd>（付款連結）。
              </>,
              <>
                點你要對帳的那個 Pay Link，複製付款網址：<span className="font-mono text-[12.5px] text-fg">moonpay.hel.io/pay/</span>
                <span className="rounded bg-primary-soft px-1 font-mono text-[12.5px] text-primary-ink">24 個英文和數字</span>。
              </>,
              <>貼到下面，再取一個你認得的名字，例如網站或商品名稱。有幾個網站在收錢，就加幾個。</>,
            ]}
          />
          <AddPaylinkForm busy={busy} error={error} onAdd={onAdd} onCancel={has ? () => setAdding(false) : undefined} />
          {!has ? (
            <Tip>
              Pay Link ID 是公開的，本來就寫在付款網址上，不是密碼。MoonMax Book 拿它去問 MoonPay：這個付款連結叫什麼、多少錢、錢會進哪個錢包。
            </Tip>
          ) : null}
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-[14px]" aria-hidden />
            再加一個 Pay Link
          </Button>
          <span className="text-[12.5px] text-fg-3">每個網站或商品各用一個 Pay Link，帳本就能分開列。</span>
        </div>
      )}
    </div>
  )
}

function AddPaylinkForm({ busy, error, onAdd, onCancel }: { busy: boolean; error: string | null; onAdd: (input: string, label: string) => void; onCancel?: () => void }) {
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
            Pay Link 付款網址或 ID
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
            名稱 <span className="font-normal text-fg-3">（選填）</span>
          </label>
          <input id={idB} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="例如：Frame to Lottie 外掛" maxLength={40} className={`${INPUT} w-full border-border`} />
        </div>
      </div>
      <ErrorLine error={error} />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={busy || !input.trim()}>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
          加入
        </Button>
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel}>
            取消
          </Button>
        ) : null}
      </div>
    </form>
  )
}

function PaylinkCard({ entry, busy, onUpdate, onRemove }: { entry: PaylinkEntry; busy: boolean; onUpdate: (patch: { label?: string | null; siteUrl?: string | null }) => void; onRemove: () => void }) {
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
          {pl && entry.label ? <p className="mt-0.5 pl-6 text-[12.5px] text-fg-3">MoonPay 上的名稱：{pl.name}</p> : null}
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
            {pl.active ? '啟用中' : '已停用'}
          </span>
          {pl.recipients.map((r) => (
            <span key={r.address} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-1.5 text-[11.5px] leading-5 text-fg-2">
              收 {r.chain} {r.token} → <span className="font-mono">{short(r.address)}</span>
            </span>
          ))}
          {pl.canSwapTokens ? <span className="rounded-md border border-border bg-muted px-1.5 text-[11.5px] leading-5 text-fg-3">可用其他幣付</span> : null}
          {!pl.requireEmail ? <span className="rounded-md border border-warn/25 bg-warn-soft px-1.5 text-[11.5px] leading-5 text-warn">沒收 Email</span> : null}
        </div>
      ) : (
        <p className="mt-1 pl-6 text-[13px] text-danger-deep">{entry.error}</p>
      )}

      {entry.siteUrl && !editing ? (
        <p className="mt-1.5 pl-6 text-[12.5px] text-fg-3">
          網站：
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
          {pl ? (
            <a
              href={pl.hostedUrl}
              target="_blank"
              rel="noreferrer"
              className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] text-fg-2 transition-transform duration-150 hover:bg-muted hover:text-fg active:scale-[0.97]"
            >
              付款頁
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} disabled={busy}>
            <Pencil className="size-[13px]" aria-hidden />
            名稱與網站
          </Button>
          <Button size="sm" variant="ghost" onClick={onRemove} disabled={busy}>
            <X className="size-[14px]" aria-hidden />
            移除
          </Button>
        </div>
      )}
    </li>
  )
}

function EditPaylink({ entry, busy, onSave, onCancel }: { entry: PaylinkEntry; busy: boolean; onSave: (patch: { label: string | null; siteUrl: string | null }) => void; onCancel: () => void }) {
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
          名稱
        </label>
        <input id={idA} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={entry.preview?.name ?? ''} maxLength={40} className={`${INPUT} w-full border-border`} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={idB} className="block text-[12.5px] font-medium text-fg">
          放這個按鈕的網站 <span className="font-normal text-fg-3">（選填，串接檢查會比對標價）</span>
        </label>
        <input id={idB} value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://" spellCheck={false} className={`${INPUT} w-full border-border font-mono`} />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="sm" variant="primary" disabled={busy}>
          儲存
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          取消
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — receiving wallets, read from the public chain (C)

export function WalletsStep({ setup, open }: { setup: SetupState; open: boolean }) {
  if (!setup.wallets.length) {
    return <p className="text-[13.5px] text-fg-3">先完成第 1 步。加入 Pay Link 之後，它要把錢送進哪個錢包，這裡會自動列出來。</p>
  }
  return (
    <div className="space-y-4">
      <p className="text-[13.5px] leading-[1.7] text-fg-2">
        每個 Pay Link 的設定裡都寫著錢要進哪個錢包。錢包地址和交易本來就公開在區塊鏈上，MoonMax Book 直接讀，
        <strong className="font-medium text-fg">不需要 API 金鑰，也不用登入 MoonPay。</strong>
      </p>
      {open ? <WalletReads setup={setup} /> : null}
    </div>
  )
}

function WalletReads({ setup }: { setup: SetupState }) {
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
            {w.paylinkIds.length > 1 ? `${w.paylinkIds.length} 個 Pay Link 共用：` : 'Pay Link：'}
            {w.paylinkIds.map(nameOf).join('、')}
          </p>
          <WalletStatus wallet={w} view={view.status === 'ready' ? view.data : null} loading={view.status === 'loading'} error={view.status === 'error' ? view.error.message : null} />
          {w.paylinkIds.length > 1 && !setup.webhook.configured ? (
            <p className="mt-2 rounded-md bg-warn-soft px-2.5 py-1.5 text-[12.5px] leading-[1.6] text-fg-2">
              幾個 Pay Link 共用同一個錢包時，光看區塊鏈分不出錢是從哪個網站來的。做第 3 步，讓 MoonPay 每筆都通知你。
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function WalletStatus({ wallet, view, loading, error }: { wallet: ReceivingWallet; view: ReceiptsView | null; loading: boolean; error: string | null }) {
  if (!wallet.readable) return <p className="mt-2 text-[12.5px] leading-[1.6] text-fg-3">{wallet.note}</p>
  if (loading) {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-fg-3">
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
        正在讀區塊鏈…第一次會比較久
      </p>
    )
  }
  const read = view?.wallets.find((r) => r.address === wallet.address)
  const err = error ?? read?.error ?? null
  if (err) return <p className="mt-2 text-[12.5px] text-danger-deep">讀不到：{err}</p>
  const mine = view?.receipts.filter((r) => r.wallet === wallet.address) ?? []
  const latest = mine[0]
  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
      <p className="flex items-center gap-1.5 text-[12.5px] text-fg-2">
        <CircleCheck className="size-3.5 text-success" aria-hidden />
        {mine.length ? (
          <>
            鏈上讀到 <span className="num font-medium text-fg">{mine.length}</span> 筆收款，最近一筆 {latest ? `${formatDateTime(latest.receivedAt)} · ${formatTokenAmount(latest.netToken)} ${latest.token}` : ''}
          </>
        ) : (
          '讀得到，目前還沒有收款'
        )}
      </p>
      {mine.length ? (
        <a href="#/receipts" className="focus-ring inline-flex items-center gap-1 rounded text-[12.5px] font-medium text-fg underline decoration-primary decoration-2 underline-offset-[3px]">
          看收款紀錄
          <ArrowRight className="size-3" aria-hidden />
        </a>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — MoonPay webhook (B): tells us which Pay Link each payment came from

function CopyField({ value, label }: { value: string; label: string }) {
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
          aria-label={`複製${label}`}
        >
          {copied ? <CircleCheck className="size-[14px] text-success" aria-hidden /> : <Copy className="size-[14px]" aria-hidden />}
          {copied ? '已複製' : '複製'}
        </Button>
      </div>
    </div>
  )
}

export function WebhookStep({ setup, busy, error, onSave, onClear }: { setup: SetupState; busy: boolean; error: string | null; onSave: (token: string) => void; onClear: () => void }) {
  const wh = setup.webhook
  const hookUrl = `${window.location.origin}${wh.hookPath}`
  if (wh.configured) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-success/25 bg-success-soft/50 px-4 py-3">
          <p className="flex items-center gap-2 text-[14px] font-semibold">
            <CircleCheck className="size-[18px] text-success" aria-hidden />
            MoonPay 的 Secret 已存好
          </p>
          <p className="mt-1 pl-[26px] text-[12.5px] leading-[1.7] text-fg-2">
            結尾 <span className="font-mono">••••{wh.tokenHint}</span> ·{' '}
            {wh.eventCount ? `收到 ${wh.eventCount} 則通知，最近一則 ${wh.lastEventAt ? formatDateTime(wh.lastEventAt) : ''}` : '還沒收到通知'}
          </p>
        </div>
        {!wh.eventCount ? <LocalhostNote hookUrl={hookUrl} /> : null}
        <Button size="sm" variant="ghost" onClick={onClear} disabled={busy}>
          <X className="size-[14px]" aria-hidden />
          清除驗證碼
        </Button>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <p className="text-[13.5px] leading-[1.7] text-fg-2">
        區塊鏈上看得到「收了多少」，但看不到「是哪個網站賣的」。設定 webhook 之後，MoonPay 每收一筆就通知 MoonMax Book，裡面寫著是哪個 Pay Link。只有一個 Pay Link 的話可以先跳過。
      </p>
      <WhereToFind
        title="在 MoonPay 後台這樣設（以 2026-10 的畫面為準）"
        steps={[
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
        ]}
      />
      <CopyField label="Webhook 網址" value={hookUrl} />
      <LocalhostNote hookUrl={hookUrl} />
      <InlineForm label="貼上 MoonPay 的 Secret" placeholder="Add Endpoint 表單裡的 Secret" submitLabel="儲存" busy={busy} error={error} onSubmit={onSave} secret />
      <Tip>
        這個 Secret 只能用來確認「這則通知真的是 MoonPay 送的」，不能動你的帳戶或錢。它存在你電腦的 <span className="font-mono text-[12px]">data/webhook.local.json</span>，畫面只顯示最後 4 碼。通知裡的買家 Email、姓名、地址，MoonMax Book 收到就丟掉，只留金額、時間、交易編號和 Pay Link。
      </Tip>
    </div>
  )
}

function LocalhostNote({ hookUrl }: { hookUrl: string }) {
  if (!/\/\/(localhost|127\.0\.0\.1)/.test(hookUrl)) return null
  return (
    <Tip tone="warn">
      上面是你電腦上的網址，MoonPay 從網路上連不到，填進去也收不到通知。正式上線後會換成固定網址。想現在就在本機試：先裝
      <code className="mx-0.5 rounded bg-card px-1.5 py-0.5 font-mono text-[12px] text-fg">brew install cloudflared</code>，再跑
      <code className="mx-0.5 rounded bg-card px-1.5 py-0.5 font-mono text-[12px] text-fg">cloudflared tunnel --url http://localhost:5173</code>
      ，把它給你的 <span className="font-mono text-[12px]">https://….trycloudflare.com</span> 後面加上 <span className="font-mono text-[12px]">/api/hook/moonpay</span> 填進 Endpoint URL。這種臨時網址每次重開都會變，變了要回 MoonPay 改。透過它，外面只碰得到 webhook，碰不到其他頁面。
    </Tip>
  )
}

// ---------------------------------------------------------------------------
// Step 4 — MAX deposit address

export function MaxAddressStep({ setup, busy, error, onSave, onClear }: { setup: SetupState; busy: boolean; error: string | null; onSave: (v: string) => void; onClear: () => void }) {
  const current = setup.maxDepositAddresses.find((a) => a.chain === 'solana')
  if (current) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
          <p className="text-[12.5px] text-fg-3">MAX 的 USDC 入金地址（Solana 網路）</p>
          <p className="mt-1 break-all font-mono text-[13px] text-fg">{current.address}</p>
        </div>
        <Tip tone="warn">只能轉 Solana 網路的 USDC 到這個地址。第一次先轉 1–2 USDC 測試，確認 MAX 有入帳再轉剩下的。轉到這裡的錢，收款紀錄會標成「轉到 MAX」。</Tip>
        <Button size="sm" variant="ghost" onClick={onClear} disabled={busy}>
          <X className="size-[14px]" aria-hidden />
          換一個地址
        </Button>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <WhereToFind
        steps={[
          <>
            登入 <ExtLink href={MAX_URL}>MAX</ExtLink>，先完成 Lv.1 身分驗證和 Lv.2 銀行驗證（綁你本人名下的帳戶）。
          </>,
          <>
            到 <Kbd>錢包</Kbd> → <Kbd>USDC</Kbd> → <Kbd>入金</Kbd>。
          </>,
          <>
            <strong className="font-medium text-fg">網路選 Solana</strong>，複製地址。同一個幣在不同網路地址不同，別拿錯。
          </>,
        ]}
      />
      <InlineForm label="MAX 的 Solana USDC 入金地址" placeholder="貼上 Solana 地址" submitLabel="儲存" busy={busy} error={error} onSubmit={onSave} />
      <Tip>地址會存在你電腦上的設定檔。MoonMax Book 會把轉到這個地址的錢標成「轉到 MAX」，之後對出金紀錄用。</Tip>
    </div>
  )
}

export function CsvStep(): ReactNode {
  return (
    <p className="text-[13.5px] leading-[1.7] text-fg-2">
      MAX 沒有開放給第三方的 API，賣成台幣的紀錄要從 MAX 匯出 CSV 再匯入。匯入後每筆出金會用先進先出法對到你的收款，算出賺賠。這個功能還在做。
    </p>
  )
}
