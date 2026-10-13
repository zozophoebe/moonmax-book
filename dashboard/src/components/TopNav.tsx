import { BookOpen, ReceiptText, Rocket } from 'lucide-react'
import type { Creator } from '../types/ledger'
import type { Route } from '../app/router'
import type { AuthState } from '../services/auth'
import { href } from '../app/router'
import { LangToggle, useT } from '../i18n'
import { AccountMenu } from './AccountMenu'
import { LogoMark, Wordmark } from './Logo'

type Link = { key: string; label: string; to: string; Icon: typeof BookOpen; activeFor: Route['name'] }

export function TopNav({ route, creator, auth }: { route: Route; creator: Creator | null; auth: AuthState }) {
  const t = useT()
  const links: Link[] = [
    { key: 'dashboard', label: t('開始使用', 'Get started'), to: '#/', Icon: Rocket, activeFor: 'dashboard' },
    { key: 'receipts', label: t('收款紀錄', 'Receipts'), to: '#/receipts', Icon: ReceiptText, activeFor: 'receipts' },
    { key: 'docs', label: t('說明文件', 'Guides'), to: '#/docs/who', Icon: BookOpen, activeFor: 'docs' },
  ]
  const item = (l: Link, mobile: boolean) => {
    const active = l.activeFor === route.name
    return (
      <a
        key={l.key}
        href={href(l.to)}
        aria-current={active ? 'page' : undefined}
        className={`focus-ring inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 ${mobile ? 'text-[13px]' : 'text-[13.5px]'} transition-transform duration-150 active:scale-[0.97] ${
          active ? 'bg-muted font-medium text-fg' : 'text-fg-3 hover:bg-muted hover:text-fg'
        }`}
      >
        <l.Icon className="size-4" aria-hidden />
        {l.label}
      </a>
    )
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-6 px-5 md:px-8">
        <a href={href('#/')} className="focus-ring flex shrink-0 items-center gap-2.5 rounded-md">
          <LogoMark size={30} />
          <Wordmark />
        </a>
        <nav aria-label={t('主選單', 'Main')} className="hidden items-center gap-1 md:flex">
          {links.map((l) => item(l, false))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <LangToggle />
          <AccountMenu creator={creator} auth={auth} />
        </div>
      </div>
      <nav aria-label={t('主選單', 'Main')} className="flex gap-1 overflow-x-auto border-t border-border px-4 py-1.5 md:hidden">
        {links.map((l) => item(l, true))}
      </nav>
    </header>
  )
}
