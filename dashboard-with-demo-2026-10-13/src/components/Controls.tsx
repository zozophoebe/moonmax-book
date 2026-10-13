import type { Creator } from '../types/ledger'
import { SkeletonBar } from './atoms'

export function YearToggle({ year, years, onYearChange }: { year: number; years: number[]; onYearChange: (y: number) => void }) {
  return (
    <div role="group" aria-label="選擇年度" className="inline-flex rounded-lg bg-muted p-1">
      {years.map((y) => {
        const active = y === year
        return (
          <button
            key={y}
            type="button"
            aria-pressed={active}
            onClick={() => onYearChange(y)}
            className={`focus-ring num h-7 rounded-md px-3 text-[13px] transition-transform duration-150 active:scale-[0.96] ${
              active ? 'bg-card font-medium text-fg shadow-sheet' : 'text-fg-3 hover:text-fg'
            }`}
          >
            {y}
          </button>
        )
      })}
    </div>
  )
}

export function CreatorTag({ creator }: { creator: Creator | null }) {
  if (!creator) {
    return (
      <div className="flex items-center gap-2.5">
        <SkeletonBar className="size-8 rounded-full" />
        <SkeletonBar className="hidden h-3.5 w-24 md:block" />
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2.5">
      <span aria-hidden className="grid size-8 place-items-center rounded-full border border-border bg-muted text-[13px] font-medium text-fg-2">
        {creator.displayName.slice(0, 1)}
      </span>
      <div className="hidden leading-tight md:block">
        <p className="text-[13px] font-medium">{creator.displayName}</p>
        <p className="text-[11.5px] text-fg-3">{creator.studioName}</p>
      </div>
    </div>
  )
}
