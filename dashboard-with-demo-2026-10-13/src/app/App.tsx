import { ArrowRight, FlaskConical } from 'lucide-react'
import { useResource } from '../lib/useResource'
import { getCreator } from '../services/creator'
import { getPlatformStatus } from '../services/platform'
import { isDemo } from '../services/mode'
import type { PlatformStatus } from '../types/platform'
import { TopNav } from '../components/TopNav'
import { currentScenario } from '../demo/sim'
import { DevScenarioSwitcher } from '../demo/DevScenarioSwitcher'
import { useRoute } from './router'
import { HomePage } from './home/HomePage'
import { DashboardPage } from './dashboard/DashboardPage'
import { PlatformPage } from './platform/PlatformPage'
import { ReceiptsPage } from './receipts/ReceiptsPage'
import { DocsPage } from './docs/DocsPage'

export function App() {
  const route = useRoute()
  const demo = isDemo()
  const [creator] = useResource(getCreator, [])
  // The platform check makes live network calls; only run it on its own page.
  const onPlatform = !demo && route.name === 'platform'
  const [platform, reloadPlatform] = useResource(
    () => (onPlatform ? getPlatformStatus() : new Promise<PlatformStatus>(() => {})),
    [onPlatform],
  )
  const who = creator.status === 'ready' ? creator.data : null

  return (
    <div className="min-h-dvh bg-background">
      <TopNav route={route} demo={demo} creator={who} />
      {demo ? <DemoBanner /> : null}
      {route.name === 'docs' ? (
        <DocsPage slug={route.slug} />
      ) : route.name === 'receipts' ? (
        <ReceiptsPage />
      ) : demo ? (
        <DashboardPage creator={who} />
      ) : route.name === 'platform' ? (
        <PlatformPage platform={platform} onRecheck={reloadPlatform} />
      ) : (
        <HomePage />
      )}
      {demo ? <DevScenarioSwitcher current={currentScenario()} /> : null}
    </div>
  )
}

function DemoBanner() {
  return (
    <div className="border-b border-warn/20 bg-warn-soft">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2 text-[13px] md:px-8">
        <FlaskConical className="size-4 text-warn" aria-hidden />
        <span className="text-fg-2">這是示範帳本，所有金額、交易和地址都是假資料，請勿轉帳。</span>
        <a href="/" className="focus-ring ml-auto inline-flex items-center gap-1 rounded font-medium text-fg underline decoration-primary decoration-2 underline-offset-[3px]">
          回到 MoonMax Book 開始設定
          <ArrowRight className="size-3.5" aria-hidden />
        </a>
      </div>
    </div>
  )
}
