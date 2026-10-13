import { ArrowLeft, ArrowUpRight, BookOpen, FlaskConical, LayoutDashboard, PlugZap, ReceiptText, Rocket } from 'lucide-react'
import type { Creator } from '../types/ledger'
import type { Route } from '../app/router'
import { href } from '../app/router'
import { CreatorTag } from './Controls'
import { LogoMark, Wordmark } from './Logo'

type Link = { key: string; label: string; to: string; Icon: typeof BookOpen; external?: boolean; activeFor?: Route['name'] }

export function TopNav({ route, demo, creator }: { route: Route; demo: boolean; creator: Creator | null }) {
  const links: Link[] = demo
    ? [
        { key: 'dashboard', label: '示範帳本', to: href('#/'), Icon: LayoutDashboard, activeFor: 'dashboard' },
        { key: 'receipts', label: '收款紀錄', to: href('#/receipts'), Icon: ReceiptText, activeFor: 'receipts' },
        { key: 'docs', label: '說明文件', to: href('#/docs/who'), Icon: BookOpen, activeFor: 'docs' },
        { key: 'back', label: '回到 MoonMax Book', to: '/', Icon: ArrowLeft, external: true },
      ]
    : [
        { key: 'dashboard', label: '開始使用', to: href('#/'), Icon: Rocket, activeFor: 'dashboard' },
        { key: 'receipts', label: '收款紀錄', to: href('#/receipts'), Icon: ReceiptText, activeFor: 'receipts' },
        { key: 'platform', label: '串接檢查', to: href('#/platform'), Icon: PlugZap, activeFor: 'platform' },
        { key: 'docs', label: '說明文件', to: href('#/docs/who'), Icon: BookOpen, activeFor: 'docs' },
        { key: 'demo', label: '示範帳本', to: '/demo/', Icon: FlaskConical, external: true },
      ]

  const item = (l: Link, mobile: boolean) => {
    const active = l.activeFor === route.name
    return (
      <a
        key={l.key}
        href={l.to}
        aria-current={active ? 'page' : undefined}
        className={`focus-ring inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 ${mobile ? 'text-[13px]' : 'text-[13.5px]'} transition-transform duration-150 active:scale-[0.97] ${
          active ? 'bg-muted font-medium text-fg' : 'text-fg-3 hover:bg-muted hover:text-fg'
        }`}
      >
        <l.Icon className="size-4" aria-hidden />
        {l.label}
        {l.external && l.key === 'demo' ? <ArrowUpRight className="size-3 opacity-60" aria-hidden /> : null}
      </a>
    )
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-6 px-5 md:px-8">
        <a href={demo ? '/demo/' : href('#/')} className="focus-ring flex shrink-0 items-center gap-2.5 rounded-md">
          <LogoMark size={30} />
          <Wordmark />
          {demo ? <span className="rounded-md border border-warn/25 bg-warn-soft px-1.5 text-[11.5px] font-medium leading-5 text-warn">示範</span> : null}
        </a>
        <nav aria-label="主選單" className="hidden items-center gap-1 md:flex">
          {links.map((l) => item(l, false))}
        </nav>
        <div className="ml-auto">
          <CreatorTag creator={creator} />
        </div>
      </div>
      <nav aria-label="主選單" className="flex gap-1 overflow-x-auto border-t border-border px-4 py-1.5 md:hidden">
        {links.map((l) => item(l, true))}
      </nav>
    </header>
  )
}
