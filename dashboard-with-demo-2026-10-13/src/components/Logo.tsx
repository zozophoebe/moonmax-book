import { useId } from 'react'

// MoonMax Book mark: a crescent moon setting into ruled ledger lines. Source of truth: public/logo-mark.svg.
export function LogoMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={`shrink-0 ${className}`} role="img" aria-label="MoonMax Book">
      <defs>
        <clipPath id={`${id}-below`}>
          <rect x="0" y="18.4" width="32" height="13.6" />
        </clipPath>
        <mask id={`${id}-mark`} maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
          <rect width="32" height="32" fill="#000" />
          <circle cx="16.4" cy="16" r="10.2" fill="#fff" />
          <circle cx="21.8" cy="11.2" r="8.6" fill="#000" />
          <circle cx="16.4" cy="16" r="10.2" fill="#fff" clipPath={`url(#${id}-below)`} />
          <rect x="0" y="18.4" width="32" height="1.6" fill="#000" />
          <rect x="0" y="22" width="32" height="1.6" fill="#000" />
        </mask>
      </defs>
      <rect width="32" height="32" rx="8" fill="var(--color-primary)" />
      <rect width="32" height="32" fill="var(--color-primary-fg)" mask={`url(#${id}-mark)`} />
    </svg>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`text-[15px] tracking-[-0.02em] ${className}`}>
      <span className="font-semibold">MoonMax</span> <span className="text-fg-3">Book</span>
    </span>
  )
}
