import { useId } from 'react'

// MoonMax Book mark: a full moon whose lit edge breaks into a checkerboard of pixels.
// Moon centre (55,60) r=35, cut at x=70. 10-unit cells: row r spans columns |r-2|…(4, or 3 on the
// top and bottom rows), black where (column+row) is even — a '<' bitten out, a zigzag spilling right.
// Source of truth: public/logo-mark.svg.
const WHITE_CELLS = 'M70 35h10v10h-10zM60 45h10v10h-10zM80 45h10v10h-10zM50 55h10v10h-10zM70 55h10v10h-10zM60 65h10v10h-10zM80 65h10v10h-10zM70 75h10v10h-10z'
const BLACK_CELLS = 'M60 35h10v10h-10zM50 45h10v10h-10zM70 45h10v10h-10zM40 55h10v10h-10zM60 55h10v10h-10zM80 55h10v10h-10zM50 65h10v10h-10zM70 65h10v10h-10zM60 75h10v10h-10z'

export function LogoMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={`shrink-0 ${className}`} role="img" aria-label="MoonMax Book">
      <defs>
        <clipPath id={`${id}-cut`}>
          <rect width="70" height="120" />
        </clipPath>
      </defs>
      <rect width="120" height="120" rx="28" fill="#18181B" />
      <circle cx="55" cy="60" r="35" fill="#FFFFFF" clipPath={`url(#${id}-cut)`} />
      <path fill="#FFFFFF" d={WHITE_CELLS} />
      <path fill="#18181B" d={BLACK_CELLS} />
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
