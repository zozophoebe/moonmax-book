import type { ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useT, type T } from '../../i18n'

export type StepTone = 'done' | 'current' | 'todo' | 'optional' | 'recommended' | 'later'

const toneChip = (t: T): Record<StepTone, { label: string; cls: string }> => ({
  done: { label: t('完成', 'Done'), cls: 'border-success/20 bg-success-soft text-success' },
  current: { label: t('現在做這步', 'Do this now'), cls: 'border-primary-ink/20 bg-primary-soft text-primary-ink' },
  todo: { label: t('待完成', 'To do'), cls: 'border-border bg-muted text-fg-3' },
  optional: { label: t('選用', 'Optional'), cls: 'border-border bg-muted text-fg-3' },
  recommended: { label: t('建議', 'Recommended'), cls: 'border-primary-ink/15 bg-card text-primary-ink' },
  later: { label: t('開發中', 'Coming soon'), cls: 'border-border bg-muted text-fg-3' },
})

export function StepShell({
  n,
  title,
  summary,
  tone,
  minutes,
  open,
  onToggle,
  children,
}: {
  n: number
  title: string
  summary: string
  tone: StepTone
  minutes?: number
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const t = useT()
  const chip = toneChip(t)[tone]
  const done = tone === 'done'
  const current = tone === 'current'
  return (
    <section
      id={`step-${n}`}
      className={`animate-rise rounded-xl border bg-card shadow-sheet ${current ? 'border-fg/25 shadow-lift' : 'border-border'} ${tone === 'later' ? 'opacity-70' : ''}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="focus-ring flex w-full items-start gap-3.5 rounded-xl px-5 py-4 text-left transition-transform duration-150 active:scale-[0.995]"
      >
        <span
          className={`num mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold ${
            done ? 'bg-success text-card' : current ? 'bg-primary text-primary-fg' : 'border border-border-strong bg-card text-fg-3'
          }`}
        >
          {done ? <Check className="size-4" strokeWidth={3} aria-hidden /> : n}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className={`text-[15.5px] tracking-[-0.01em] ${done ? 'font-medium text-fg-2' : 'font-semibold text-fg'}`}>{title}</span>
            <span className={`rounded-md border px-1.5 text-[11.5px] leading-5 ${chip.cls}`}>{chip.label}</span>
            {minutes && !done ? <span className="text-[12px] text-fg-3">{t(`約 ${minutes} 分鐘`, `~${minutes} min`)}</span> : null}
          </span>
          <span className="mt-0.5 block text-[13px] leading-[1.65] text-fg-3">{summary}</span>
        </span>
        <ChevronDown className={`mt-1 size-4 shrink-0 text-fg-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open ? <div className="animate-rise border-t border-border px-5 pb-5 pt-4 md:pl-[3.75rem]">{children}</div> : null}
    </section>
  )
}

export function WhereToFind({ title, steps }: { title?: string; steps: ReactNode[] }) {
  const t = useT()
  return (
    <div className="rounded-lg border border-border bg-muted/50 px-4 py-3.5">
      <p className="text-[12.5px] font-medium text-fg-2">{title ?? t('去哪裡找', 'Where to find it')}</p>
      <ol className="mt-2 space-y-1.5">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2.5 text-[13.5px] leading-[1.7] text-fg-2">
            <span className="num mt-[2px] grid size-5 shrink-0 place-items-center rounded-full bg-card text-[11px] font-medium text-fg-3 ring-1 ring-border">
              {i + 1}
            </span>
            <span className="min-w-0">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function Tip({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: ReactNode }) {
  return (
    <p
      className={`rounded-lg border px-3.5 py-2.5 text-[13px] leading-[1.7] ${
        tone === 'warn' ? 'border-warn/25 bg-warn-soft text-fg-2' : 'border-border bg-card text-fg-2'
      }`}
    >
      {children}
    </p>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <span className="rounded-md border border-border bg-card px-1.5 py-[1px] text-[12.5px] font-medium text-fg shadow-sheet">{children}</span>
}
