import { RotateCw, ShieldCheck } from 'lucide-react'
import type { PlatformStatus } from '../../types/platform'
import type { Resource } from '../../lib/useResource'
import { Button, Card, SectionError, SkeletonBar } from '../../components/atoms'
import { CheckGroups, CountsStrip, PaylinkSummary } from '../../components/Platform'

export function PlatformPage({ platform, onRecheck }: { platform: Resource<PlatformStatus>; onRecheck: () => void }) {
  return (
    <div className="mx-auto max-w-[1280px] px-5 pb-32 pt-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.03em]">串接檢查</h1>
          <p className="mt-0.5 max-w-[62ch] text-[13.5px] text-fg-3">
            讀 MoonPay 公開的付款連結設定、你的上線網站和收款錢包，檢查收款到出金這條路有沒有接好。
          </p>
        </div>
        <Button onClick={onRecheck} disabled={platform.status === 'loading'}>
          <RotateCw className={`size-4 ${platform.status === 'loading' ? 'animate-spin' : ''}`} aria-hidden />
          重新檢查
        </Button>
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5 text-[12.5px] leading-[1.7] text-fg-2">
        <ShieldCheck className="mt-[2px] size-4 shrink-0 text-success" aria-hidden />
        這頁永遠讀真實資料，不會用到示範帳本的假資料。MoonMax Book 不需要 MoonPay API 金鑰：收款從公開的區塊鏈讀，來源靠 MoonPay 的通知分辨。
      </p>

      {platform.status === 'loading' ? (
        <div className="mt-6 space-y-6" aria-busy aria-label="檢查中">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonBar key={i} className="h-[84px] rounded-xl" />
            ))}
          </div>
          <p className="text-[13px] text-fg-3">正在連到 MoonPay 和你的上線網站，大約需要幾秒…</p>
        </div>
      ) : platform.status === 'error' ? (
        <Card className="mt-6">
          <SectionError title="檢查沒有完成" error={platform.error} onRetry={onRecheck} />
        </Card>
      ) : (
        <>
          <div className="mt-6">
            <CountsStrip counts={platform.data.counts} />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <CheckGroups checks={platform.data.checks} />
            <PaylinkSummary status={platform.data} />
          </div>
        </>
      )}
    </div>
  )
}
