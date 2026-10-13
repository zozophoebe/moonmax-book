import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, LoaderCircle, LogOut, RotateCcw, TriangleAlert } from 'lucide-react'
import type { Creator } from '../types/ledger'
import { logout, resetEverything, type AuthState } from '../services/auth'
import { Button, SkeletonBar } from './atoms'
import { useT } from '../i18n'

const startOver = () => {
  window.location.hash = '#/'
  window.location.reload()
}

export function AccountMenu({ creator, auth }: { creator: Creator | null; auth: AuthState }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!creator) {
    return (
      <div className="flex items-center gap-2.5">
        <SkeletonBar className="size-8 rounded-full" />
        <SkeletonBar className="hidden h-3.5 w-24 md:block" />
      </div>
    )
  }

  const name = creator.companyName ?? t('新的使用者', 'New user')
  const sub = creator.sourceCount ? t(`${creator.sourceCount} 個收款來源`, `${creator.sourceCount} payment source${creator.sourceCount > 1 ? 's' : ''}`) : t('尚未設定', 'Not set up yet')

  const signOutOnly = async () => {
    setBusy(true)
    await logout().catch(() => null)
    startOver()
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className="focus-ring -mr-2 flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 text-left transition-transform duration-150 hover:bg-muted active:scale-[0.98]"
      >
        <span aria-hidden className="grid size-8 place-items-center rounded-full border border-border bg-muted text-[13px] font-medium text-fg-2">
          {name.slice(0, 1)}
        </span>
        <span className="hidden leading-tight md:block">
          <span className="block text-[13px] font-medium">{name}</span>
          <span className="block text-[11.5px] text-fg-3">{sub}</span>
        </span>
        <ChevronDown className={`size-3.5 text-fg-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open ? (
        <div id={menuId} role="menu" aria-label={t('帳號', 'Account')} className="animate-rise absolute right-0 top-full z-40 mt-2 w-[272px] rounded-xl border border-border bg-card p-1.5 shadow-float">
          <div className="px-3 pb-2.5 pt-2">
            <p className="text-[13.5px] font-medium">{name}</p>
            <p className="text-[12px] text-fg-3">{auth.ownerEmail ? t(`已用 Google 登入：${auth.ownerEmail}`, `Signed in with Google: ${auth.ownerEmail}`) : sub}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          {auth.method === 'google' ? <MenuItem Icon={LogOut} label={t('登出', 'Sign out')} hint={t('設定都會留著，下次登入繼續用', 'Your settings stay for next time')} disabled={busy} onSelect={signOutOnly} /> : null}
          <MenuItem
            Icon={RotateCcw}
            label={t('登出並回到初始狀態', 'Sign out and start over')}
            hint={auth.method === 'google' ? t('清除所有設定和綁定的 Google 帳號', 'Clears every setting and the linked Google account') : t('清除所有設定，從第 1 步重新開始', 'Clears every setting; back to step 1')}
            tone="danger"
            disabled={busy}
            onSelect={() => {
              setOpen(false)
              setConfirming(true)
            }}
          />
        </div>
      ) : null}

      {/* Portal: the sticky header's backdrop-blur would otherwise trap position:fixed inside it. */}
      {confirming ? createPortal(<ResetDialog method={auth.method} onCancel={() => setConfirming(false)} />, document.body) : null}
    </div>
  )
}

function MenuItem({ Icon, label, hint, tone, disabled, onSelect }: { Icon: typeof LogOut; label: string; hint: string; tone?: 'danger'; disabled?: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      disabled={disabled}
      className={`focus-ring flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-transform duration-150 active:scale-[0.98] disabled:opacity-50 ${
        tone === 'danger' ? 'hover:bg-danger-soft' : 'hover:bg-muted'
      }`}
    >
      <Icon className={`mt-[2px] size-4 shrink-0 ${tone === 'danger' ? 'text-danger' : 'text-fg-3'}`} aria-hidden />
      <span>
        <span className={`block text-[13.5px] font-medium ${tone === 'danger' ? 'text-danger-deep' : 'text-fg'}`}>{label}</span>
        <span className="block text-[12px] text-fg-3">{hint}</span>
      </span>
    </button>
  )
}

function ResetDialog({ method, onCancel }: { method: AuthState['method']; onCancel: () => void }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleId = useId()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  const confirm = async () => {
    setBusy(true)
    setError(null)
    try {
      await resetEverything()
      startOver()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-fg/40 px-4" onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="animate-rise w-full max-w-[440px] rounded-xl border border-border bg-card p-6 shadow-float">
        <p className="flex items-center gap-2 text-[16px] font-semibold" id={titleId}>
          <TriangleAlert className="size-5 text-danger" aria-hidden />
          {t('登出並回到初始狀態？', 'Sign out and start over?')}
        </p>
        <p className="mt-2 text-[13.5px] leading-[1.7] text-fg-2">
          {t('MoonMax Book 會清除自己存的這些東西，下次打開會回到第一次使用的樣子：', 'MoonMax Book will clear what it has stored, so next time it opens like the first time:')}
        </p>
        <ul className="mt-2 space-y-1 text-[13.5px] text-fg-2">
          {[
            t('加入的 Pay Link 和網站名稱', 'Your Pay Links and their names'),
            t('MoonPay 的 Webhook Secret', 'The MoonPay webhook Secret'),
            t('MAX 出金地址', 'Your MAX deposit address'),
            t('收到的 MoonPay 通知', 'MoonPay notifications received'),
            ...(method === 'google' ? [t('綁定的 Google 帳號（下次用 Google 登入時重新綁定）', 'The linked Google account (linked again at the next Google sign-in)')] : []),
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden className="mt-[9px] size-1 shrink-0 rounded-full bg-danger" />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-3 rounded-lg bg-muted px-3 py-2.5 text-[12.5px] leading-[1.7] text-fg-3">
          {t(
            'MoonPay 和 MAX 上的東西都不會動，鏈上的收款紀錄也還在，重新加回 Pay Link 就讀得到。MoonPay 後台的 Endpoint 不會被刪，清除後送來的通知會被拒收，重新設定 Secret 才會恢復。',
            'Nothing on MoonPay or MAX changes, and your payments stay on the chain — add the Pay Links back and they show up again. The Endpoint in MoonPay isn’t deleted; notifications are refused until you set the Secret again.',
          )}
        </p>
        {error ? <p className="mt-3 text-[13px] text-danger-deep">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onCancel} disabled={busy} autoFocus>
            {t('取消', 'Cancel')}
          </Button>
          <Button variant="danger" onClick={confirm} disabled={busy}>
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <RotateCcw className="size-4" aria-hidden />}
            {method === 'none' ? t('清除，重新開始', 'Clear and start over') : t('清除並登出', 'Clear and sign out')}
          </Button>
        </div>
      </div>
    </div>
  )
}
