import { useState, type ReactNode } from 'react'
import { LoaderCircle, LockKeyhole, TriangleAlert } from 'lucide-react'
import { GOOGLE_START } from '../services/auth'
import { LangToggle, useT, type T } from '../i18n'
import { LogoMark, Wordmark } from '../components/Logo'

const googleError = (t: T, code: string) =>
  ({
    denied: t('你取消了 Google 登入。', 'You cancelled Google sign-in.'),
    unverified: t('這個 Google 帳號的 Email 還沒驗證，沒辦法用來登入。', 'This Google account’s email isn’t verified, so it can’t be used to sign in.'),
  })[code] ?? t('Google 登入沒有完成，再試一次。', 'Google sign-in didn’t finish. Try again.')

// Read once, then drop it from the address bar so a reload doesn't show it again.
function takeAuthError(): string | null {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('auth_error')
  if (!code) return null
  params.delete('auth_error')
  const rest = params.toString()
  window.history.replaceState(null, '', `${window.location.pathname}${rest ? `?${rest}` : ''}${window.location.hash}`)
  return code
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="relative grid min-h-dvh place-items-center bg-background px-4">
      <LangToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-[380px]">
        <div className="flex items-center justify-center gap-2.5">
          <LogoMark size={34} />
          <span className="text-[18px]">
            <Wordmark />
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A11.99 11.99 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.57.38-2.29V6.61H1.28a12 12 0 0 0 0 10.78l4.01-3.1Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.28 6.61l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77Z" />
    </svg>
  )
}

export function LoginPage({ configured }: { configured: boolean }) {
  return configured ? <GoogleLogin /> : <NotConfigured />
}

function NotConfigured() {
  const t = useT()
  return (
    <Frame>
      <div className="animate-rise mt-6 rounded-xl border border-border bg-card p-6 shadow-sheet">
        <p className="flex items-center gap-2 text-[15px] font-semibold">
          <LockKeyhole className="size-4 text-fg-3" aria-hidden />
          {t('登入還沒設定好', 'Sign-in isn’t set up yet')}
        </p>
        <p className="mt-1 text-[13px] leading-[1.7] text-fg-3">
          {t(
            '這個 MoonMax Book 要用 Google 登入，但 Google 登入還沒接上，所以先關著，不會顯示任何資料。網站管理者把 Google 金鑰設定到 Vercel、重新部署之後就能登入。',
            'This MoonMax Book uses Google sign-in, which isn’t connected yet — so it stays closed and shows nothing. It opens once whoever runs the site adds the Google keys to Vercel and redeploys.',
          )}
        </p>
      </div>
    </Frame>
  )
}

function GoogleLogin() {
  const t = useT()
  const [errorCode] = useState(takeAuthError)
  const [going, setGoing] = useState(false)
  const error = errorCode ? googleError(t, errorCode) : null
  return (
    <Frame>
      <div className="animate-rise mt-6 rounded-xl border border-border bg-card p-6 shadow-sheet">
        <p className="flex items-center gap-2 text-[15px] font-semibold">
          <LockKeyhole className="size-4 text-fg-3" aria-hidden />
          {t('登入', 'Sign in')}
        </p>
        <p className="mt-1 text-[13px] leading-[1.7] text-fg-3">
          {t(
            '用 Google 帳號登入就能開始，不用另外記密碼。每個帳號有自己的帳本，別人看不到你的資料。還沒有 MoonPay 或 MAX 帳號，也可以先載入範例資料看看。',
            'Sign in with your Google account to start — no extra password. Every account gets its own ledger that nobody else can see. No MoonPay or MAX account yet? You can load sample data and look around.',
          )}
        </p>
        {error ? (
          <p role="alert" className="mt-3 flex items-start gap-1.5 rounded-lg bg-danger-soft px-3 py-2 text-[13px] leading-[1.6] text-danger-deep">
            <TriangleAlert className="mt-[3px] size-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}
        <a
          href={GOOGLE_START}
          onClick={() => setGoing(true)}
          className="focus-ring mt-4 flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-border-strong bg-card text-[14px] font-medium shadow-sheet transition-transform duration-150 hover:bg-muted active:scale-[0.98]"
        >
          {going ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <GoogleMark />}
          {t('用 Google 登入', 'Sign in with Google')}
        </a>
      </div>
    </Frame>
  )
}
