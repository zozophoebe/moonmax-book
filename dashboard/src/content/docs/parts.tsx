import type { ReactNode } from 'react'
import { CircleX, Info, TriangleAlert, type LucideIcon } from 'lucide-react'

export const internal = (hash: string) => `${window.location.search}${hash}`

export function Note({ tone = 'info', title, children }: { tone?: 'info' | 'warn'; title: string; children: ReactNode }) {
  const warn = tone === 'warn'
  const Icon = warn ? TriangleAlert : Info
  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3.5 ${warn ? 'border-warn/25 bg-warn-soft' : 'border-border bg-muted/60'}`}>
      <Icon className={`mt-[3px] size-[18px] shrink-0 ${warn ? 'text-warn' : 'text-fg-3'}`} aria-hidden />
      <div className="text-[14px] leading-[1.8] text-fg-2">
        <p className="font-semibold text-fg">{title}</p>
        <div className="mt-0.5 space-y-2">{children}</div>
      </div>
    </div>
  )
}

export function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="mt-8 grid grid-cols-[2rem_1fr] gap-x-3">
      <span className="num mt-0.5 grid size-7 place-items-center rounded-full bg-primary text-[13px] font-semibold text-primary-fg">{n}</span>
      <div className="min-w-0">
        <h3 className="mt-0 text-[16.5px] font-semibold tracking-[-0.01em] text-fg">{title}</h3>
        <div className="doc mt-2">{children}</div>
      </div>
    </section>
  )
}

// Big "who is this for" cards: a large icon tile, plus the same icon as a faint backdrop.
export function PersonaGrid({ items }: { items: { Icon: LucideIcon; title: string; body: string }[] }) {
  return (
    <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
      {items.map(({ Icon, title, body }) => (
        <li key={title} className="relative mt-0 overflow-hidden rounded-2xl border border-border bg-background p-5 shadow-sheet">
          <Icon className="pointer-events-none absolute -bottom-6 -right-6 size-32 text-primary-ink opacity-[0.07]" strokeWidth={1.4} aria-hidden />
          <span className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-fg shadow-sheet">
            <Icon className="size-7" strokeWidth={1.8} aria-hidden />
          </span>
          <p className="mt-4 text-[17px] font-semibold leading-snug tracking-[-0.01em] text-fg">{title}</p>
          <p className="mt-1.5 text-[14px] leading-[1.7] text-fg-2">{body}</p>
        </li>
      ))}
    </ul>
  )
}

export function AvoidList({ items }: { items: { title: string; body: string }[] }) {
  return (
    <ul className="grid list-none gap-2 p-0 sm:grid-cols-2">
      {items.map(({ title, body }) => (
        <li key={title} className="mt-0 flex gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <CircleX className="mt-[3px] size-[18px] shrink-0 text-fg-3" aria-hidden />
          <span>
            <span className="block text-[14px] font-medium text-fg">{title}</span>
            <span className="block text-[13px] leading-[1.65] text-fg-3">{body}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

// How much of one sale you keep. Numbers are fixed content, worked out in the article text.
export function KeepBars({ caption, rows }: { caption: string; rows: { name: string; detail: string; keep: string; pct: number; best?: boolean }[] }) {
  return (
    <figure className="rounded-2xl border border-border bg-background p-5">
      <figcaption className="text-[13px] font-medium text-fg-2">{caption}</figcaption>
      <ul className="mt-4 list-none space-y-4 p-0">
        {rows.map((r) => (
          <li key={r.name} className="mt-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[14px] font-semibold text-fg">{r.name}</span>
              <span className={`num text-[17px] font-semibold ${r.best ? 'text-fg' : 'text-fg-2'}`}>{r.keep}</span>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className={`h-full rounded-full ${r.best ? 'bg-primary' : 'bg-border-strong'}`} style={{ width: `${r.pct}%` }} />
            </div>
            <p className="mt-1 text-[12.5px] text-fg-3">{r.detail}</p>
          </li>
        ))}
      </ul>
    </figure>
  )
}

// A numbered path with an icon per stop.
export function Timeline({ items }: { items: { Icon: LucideIcon; title: string; body: ReactNode }[] }) {
  return (
    <ol className="relative list-none space-y-0 p-0">
      {items.map(({ Icon, title, body }, i) => (
        <li key={title} className="relative mt-0 grid grid-cols-[3rem_1fr] gap-x-3 pb-6 last:pb-0">
          {i < items.length - 1 ? <span aria-hidden className="absolute left-[23px] top-12 h-[calc(100%-3rem)] w-px bg-border-strong" /> : null}
          <span className="relative grid size-12 place-items-center rounded-2xl border border-border bg-card text-fg shadow-sheet">
            <Icon className="size-5" aria-hidden />
            <span className="num absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-fg">{i + 1}</span>
          </span>
          <div className="min-w-0 pt-1">
            <p className="text-[15.5px] font-semibold text-fg">{title}</p>
            <div className="mt-1 text-[14px] leading-[1.75] text-fg-2">{body}</div>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function Figure({ src, alt, caption, href }: { src: string; alt: string; caption: ReactNode; href?: string }) {
  const img = <img src={src} alt={alt} loading="lazy" className="block w-full rounded-xl border border-border shadow-sheet" />
  return (
    <figure>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="focus-ring block rounded-xl no-underline transition-transform duration-200 hover:-translate-y-0.5">
          {img}
        </a>
      ) : (
        img
      )}
      <figcaption className="mt-2 text-[12.5px] leading-[1.6] text-fg-3">{caption}</figcaption>
    </figure>
  )
}

export function Pitch({ title, children, points }: { title: string; children: ReactNode; points: { Icon: LucideIcon; text: string }[] }) {
  return (
    <div className="rounded-2xl border border-primary-ink/15 bg-primary-soft/60 p-5 md:p-6">
      <p className="text-[18px] font-semibold tracking-[-0.01em] text-fg">{title}</p>
      <div className="mt-2 text-[14.5px] leading-[1.8] text-fg-2">{children}</div>
      <ul className="mt-4 grid list-none gap-2 p-0 sm:grid-cols-3">
        {points.map(({ Icon, text }) => (
          <li key={text} className="mt-0 flex items-start gap-2.5 rounded-xl bg-card px-3.5 py-3 shadow-sheet">
            <Icon className="mt-[2px] size-[18px] shrink-0 text-primary-ink" aria-hidden />
            <span className="text-[13.5px] leading-[1.6] text-fg">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
