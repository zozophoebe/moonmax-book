import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { AlertTriangle, RotateCw, TriangleAlert } from 'lucide-react'
import type { Chain } from '../types/ledger'
import { CHAIN_LABEL, formatTwd, isNegative } from '../lib/format'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const BUTTON_BASE =
  'focus-ring inline-flex items-center justify-center gap-2 rounded-[8px] font-medium leading-none select-none ' +
  'transition-transform duration-150 ease-out-soft active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none'

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-fg shadow-sheet hover:bg-primary-hover',
  secondary: 'bg-card text-fg border border-border shadow-sheet hover:bg-muted',
  ghost: 'text-fg-2 hover:bg-muted hover:text-fg',
  danger: 'bg-card text-danger-deep border border-danger/30 hover:bg-danger-soft hover:border-danger/60',
}

const BUTTON_SIZE = { sm: 'h-8 px-3 text-[13px]', md: 'h-10 px-4 text-[14px]' } as const

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: keyof typeof BUTTON_SIZE }) {
  return <button type="button" className={`${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${BUTTON_SIZE[size]} ${className}`} {...rest} />
}

export function ChainBadge({ chain, className = '' }: { chain: Chain; className?: string }) {
  const dot = chain === 'solana' ? 'bg-chain-solana' : 'bg-chain-base'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5 text-[12px] leading-5 text-fg-2 ${className}`}
    >
      <span className={`size-1.5 rounded-full ${dot}`} aria-hidden />
      {CHAIN_LABEL[chain]}
    </span>
  )
}

// For chain names as MoonPay spells them ("Solana", "Base", …), including ones the ledger doesn't model yet.
export function NetworkBadge({ chain, className = '' }: { chain: string; className?: string }) {
  const key = chain.toLowerCase()
  const dot = key === 'solana' ? 'bg-chain-solana' : key === 'base' ? 'bg-chain-base' : 'bg-fg-3'
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5 text-[12px] leading-5 text-fg-2 ${className}`}>
      <span className={`size-1.5 rounded-full ${dot}`} aria-hidden />
      {chain}
    </span>
  )
}

export function Money({ value, signed = false, className = '' }: { value: string; signed?: boolean; className?: string }) {
  return (
    <span className={`num whitespace-nowrap ${isNegative(value) ? 'text-fg-2' : ''} ${className}`}>
      {formatTwd(value, { signed })}
    </span>
  )
}

// Reserved for records that need the creator's attention (unreconciled cashouts).
export function AttentionIcon({ className = '' }: { className?: string }) {
  return (
    <span aria-hidden className={`inline-grid size-9 shrink-0 place-items-center rounded-lg bg-danger-soft text-danger ${className}`}>
      <TriangleAlert className="size-[18px]" strokeWidth={2} />
    </span>
  )
}

export function Card({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <section
      className={`animate-rise rounded-[12px] border border-border bg-card shadow-sheet ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </section>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[12px] font-medium tracking-[0.12em] text-fg-3">{children}</p>
}

export function SkeletonBar({ className = '' }: { className?: string }) {
  return <span className={`block animate-breathe rounded-[4px] bg-border ${className}`} />
}

export function SectionError({ title, error, onRetry }: { title: string; error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 px-6 py-8" role="alert">
      <div className="flex items-center gap-2 text-fg">
        <AlertTriangle className="size-[18px] text-danger" strokeWidth={2} aria-hidden />
        <p className="text-[17px] font-semibold">{title}</p>
      </div>
      <p className="text-[14px] text-fg-2">
        {error.message}你的紀錄沒有遺失，只是這次沒讀到。其他區塊不受影響。
      </p>
      <Button size="sm" onClick={onRetry}>
        <RotateCw className="size-[14px]" aria-hidden />
        重新讀取
      </Button>
    </div>
  )
}
