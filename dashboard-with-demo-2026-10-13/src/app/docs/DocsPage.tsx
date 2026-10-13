import { ArrowLeft, ArrowRight, Clock } from 'lucide-react'
import type { DocSlug } from '../router'
import { href } from '../router'
import { ARTICLE, DOCS, DOCS_UPDATED } from '../../content/docs'

export function DocsPage({ slug }: { slug: DocSlug }) {
  const index = DOCS.findIndex((d) => d.slug === slug)
  const meta = DOCS[index] ?? DOCS[0]!
  const prev = DOCS[index - 1]
  const next = DOCS[index + 1]
  const Article = ARTICLE[meta.slug]

  return (
    <div className="mx-auto grid max-w-[1280px] gap-8 px-5 pb-32 pt-8 md:px-8 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="px-2 text-[12px] font-medium tracking-[0.06em] text-fg-3">說明文件</p>
        <nav aria-label="說明文件" className="mt-2 flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {DOCS.map((d, i) => {
            const active = d.slug === meta.slug
            return (
              <a
                key={d.slug}
                href={href(`#/docs/${d.slug}`)}
                aria-current={active ? 'page' : undefined}
                className={`focus-ring flex shrink-0 items-start gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] leading-snug transition-transform duration-150 active:scale-[0.98] ${
                  active ? 'bg-card font-medium text-fg shadow-sheet ring-1 ring-border' : 'text-fg-3 hover:bg-muted hover:text-fg'
                }`}
              >
                <span className={`num mt-[1px] text-[12px] ${active ? 'text-primary-ink' : 'text-fg-3'}`}>0{i + 1}</span>
                <span>{d.title}</span>
              </a>
            )
          })}
        </nav>
      </aside>

      <article className="animate-rise min-w-0 rounded-xl border border-border bg-card px-5 py-7 shadow-sheet md:px-10 md:py-10" key={meta.slug}>
        <header className="border-b border-border pb-6">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-fg-3">
            <span className="rounded-md bg-primary-soft px-1.5 font-medium leading-5 text-primary-ink">說明文件 0{index + 1}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />約 {meta.minutes} 分鐘
            </span>
            <span>更新於 {DOCS_UPDATED}，費率與限額以官方最新公告為準</span>
          </p>
          <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.03em] md:text-[32px]">{meta.title}</h1>
          <p className="mt-2 max-w-[60ch] text-[15px] text-fg-2">{meta.summary}</p>
        </header>

        <div className="doc mt-6 max-w-[68ch]">
          <Article />
        </div>

        <nav aria-label="上一篇與下一篇" className="mt-12 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
          {prev ? (
            <a href={href(`#/docs/${prev.slug}`)} className="focus-ring group rounded-lg border border-border px-4 py-3 transition-transform duration-150 hover:bg-muted active:scale-[0.98]">
              <span className="flex items-center gap-1 text-[12px] text-fg-3">
                <ArrowLeft className="size-3.5" aria-hidden />
                上一篇
              </span>
              <span className="mt-0.5 block text-[14px] font-medium">{prev.title}</span>
            </a>
          ) : (
            <span />
          )}
          {next ? (
            <a href={href(`#/docs/${next.slug}`)} className="focus-ring group rounded-lg border border-border px-4 py-3 text-right transition-transform duration-150 hover:bg-muted active:scale-[0.98]">
              <span className="flex items-center justify-end gap-1 text-[12px] text-fg-3">
                下一篇
                <ArrowRight className="size-3.5" aria-hidden />
              </span>
              <span className="mt-0.5 block text-[14px] font-medium">{next.title}</span>
            </a>
          ) : null}
        </nav>
      </article>
    </div>
  )
}
