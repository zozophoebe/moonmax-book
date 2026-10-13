import { LoaderCircle } from 'lucide-react'
import { useLang, useT } from '../i18n'
import { useResource } from '../lib/useResource'
import { getAuth, type AuthState } from '../services/auth'
import { getCreator } from '../services/creator'
import { Card, SectionError } from '../components/atoms'
import { TopNav } from '../components/TopNav'
import { useRoute } from './router'
import { LoginPage } from './LoginPage'
import { HomePage } from './home/HomePage'
import { ReceiptsPage } from './receipts/ReceiptsPage'
import { DocsPage } from './docs/DocsPage'

// Locally there is no login. Deployed: the owner signs in with Google, every time.
export function App() {
  const { lang } = useLang()
  const t = useT()
  const [auth, reload] = useResource(getAuth, [])
  if (auth.status === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center bg-background">
        <LoaderCircle className="size-5 animate-spin text-fg-3" aria-label={t('載入中', 'Loading')} />
      </div>
    )
  }
  if (auth.status === 'error') {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-24">
        <Card>
          <SectionError title={t('連不到 MoonMax Book', 'Can’t reach MoonMax Book')} error={auth.error} onRetry={reload} />
        </Card>
      </div>
    )
  }
  if (!auth.data.authenticated) return <LoginPage configured={auth.data.configured} />
  // Remount on language change so every view re-fetches with server messages in that language.
  return <Shell key={lang} auth={auth.data} />
}

function Shell({ auth }: { auth: AuthState }) {
  const route = useRoute()
  const [creator] = useResource(getCreator, [])

  return (
    <div className="min-h-dvh bg-background">
      <TopNav route={route} creator={creator.status === 'ready' ? creator.data : null} auth={auth} />
      {route.name === 'docs' ? <DocsPage slug={route.slug} /> : route.name === 'receipts' ? <ReceiptsPage /> : <HomePage />}
    </div>
  )
}
