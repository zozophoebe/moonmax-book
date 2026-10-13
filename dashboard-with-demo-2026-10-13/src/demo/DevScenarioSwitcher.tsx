import { ArrowUpRight, FlaskConical } from 'lucide-react'
import type { Scenario } from './sim'

const OPTIONS: { key: Scenario; label: string }[] = [
  { key: 'normal', label: '正常' },
  { key: 'empty', label: '新用戶' },
  { key: 'loading', label: '讀取中' },
  { key: 'error', label: '錯誤' },
]

// Demo page only: preview every UI state against mock data.
export function DevScenarioSwitcher({ current }: { current: Scenario }) {
  return (
    <aside className="fixed bottom-4 right-4 z-50 hidden rounded-xl border border-fg/80 bg-fg p-2 text-card shadow-float sm:block">
      <p className="flex items-center gap-1.5 px-1.5 pb-1.5 text-[11px] tracking-[0.04em] text-border">
        <FlaskConical className="size-3.5" aria-hidden />
        示範帳本 · 切換假資料情境
      </p>
      <nav className="flex gap-1" aria-label="切換假資料情境">
        {OPTIONS.map((o) => {
          const active = o.key === current
          const search = o.key === 'normal' ? '' : `?scenario=${o.key}`
          return (
            <a
              key={o.key}
              href={`${window.location.pathname}${search}${window.location.hash}`}
              aria-current={active ? 'page' : undefined}
              className={`focus-ring rounded-md px-3 py-1.5 text-[12.5px] transition-transform duration-150 active:scale-[0.95] ${
                active ? 'bg-card text-fg' : 'text-border hover:bg-white/10 hover:text-card'
              }`}
            >
              {o.label}
            </a>
          )
        })}
        <a
          href="/"
          className="focus-ring ml-1 inline-flex items-center gap-1 rounded-md border-l border-white/15 px-3 py-1.5 text-[12.5px] font-medium text-primary transition-transform duration-150 hover:bg-white/10 active:scale-[0.95]"
        >
          真實平台
          <ArrowUpRight className="size-3" aria-hidden />
        </a>
      </nav>
    </aside>
  )
}
