import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Clock, ListTree } from 'lucide-react'
import type { DocSlug } from '../router'
import { href } from '../router'
import { useLang, useT } from '../../i18n'
import { DOCS, DOCS_UPDATED } from '../../content/docs'

type Section = { id: string; text: string }

// Builds the "on this page" list from the article's own h2s, so it never drifts from the content.
function useSections(dep: string) {
  const ref = useRef<HTMLDivElement>(null)
  const [sections, setSections] = useState<Section[]>([])
  useEffect(() => {
    const heads = [...(ref.current?.querySelectorAll('h2') ?? [])]
    heads.forEach((h, i) => (h.id = `sec-${i}`))
    setSections(heads.map((h) => ({ id: h.id, text: h.textContent ?? '' })))
  }, [dep])
  return [ref, sections] as const
}

export function DocsPage({ slug }: { slug: DocSlug }) {
  const t = useT()
  const { lang } = useLang()
  const index = Math.max(0, DOCS.findIndex((d) => d.slug === slug))
  const meta = DOCS[index]!
  const prev = DOCS[index - 1]
  const next = DOCS[index + 1]
  const Body = meta.body[lang]
  const [bodyRef, sections] = useSections(`${meta.slug}-${lang}`)
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="mx-auto grid max-w-[1280px] gap-8 px-5 pb-32 pt-8 md:px-8 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_200px]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="px-2 text-[12px] font-medium tracking-[0.06em] text-fg-3">{t('說明文件', 'Guides')}</p>
        <nav aria-label={t('說明文件', 'Guides')} className="mt-2 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {DOCS.map((d, i) => {
            const active = d.slug === meta.slug
            return (
              <a
                key={d.slug}
                href={href(`#/docs/${d.slug}`)}
                aria-current={active ? 'page' : undefined}
                className={`focus-ring flex w-[240px] shrink-0 items-start gap-3 rounded-xl border px-3 py-3 transition-transform duration-150 active:scale-[0.98] lg:w-auto ${
                  active ? 'border-border bg-card shadow-sheet' : 'border-transparent hover:bg-muted'
                }`}
              >
                <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${active ? 'bg-primary text-primary-fg' : 'border border-border bg-card text-fg-3'}`}>
                  <d.Icon className="size-[18px]" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="num block text-[11.5px] text-fg-3">0{i + 1}</span>
                  <span className={`block text-[13.5px] leading-snug ${active ? 'font-semibold text-fg' : 'text-fg-2'}`}>{d.title[lang]}</span>
                  <span className="mt-0.5 block text-[12px] text-fg-3">{t(`約 ${d.minutes} 分鐘`, `~${d.minutes} min read`)}</span>
                </span>
              </a>
            )
          })}
        </nav>
      </aside>

      <article className="animate-rise min-w-0 rounded-xl border border-border bg-card px-5 py-7 shadow-sheet md:px-10 md:py-10" key={`${meta.slug}-${lang}`}>
        <header className="border-b border-border pb-6">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-fg-3">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-primary-soft px-1.5 font-medium leading-5 text-primary-ink">
              <meta.Icon className="size-3.5" aria-hidden />
              {t(`說明文件 0${index + 1}`, `Guide 0${index + 1}`)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              {t(`約 ${meta.minutes} 分鐘`, `~${meta.minutes} min`)}
            </span>
            <span>{t(`更新於 ${DOCS_UPDATED}，費率與限額以官方最新公告為準`, `Updated ${DOCS_UPDATED}; official announcements win on fees and limits`)}</span>
          </p>
          <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.03em] md:text-[34px]">{meta.title[lang]}</h1>
          <p className="mt-2 max-w-[62ch] text-[15.5px] leading-[1.7] text-fg-2">{meta.summary[lang]}</p>

          {sections.length ? (
            <div className="mt-5 rounded-xl border border-border bg-background px-4 py-3 xl:hidden">
              <p className="flex items-center gap-1.5 text-[12px] font-medium text-fg-3">
                <ListTree className="size-3.5" aria-hidden />
                {t('這篇的內容', 'In this guide')}
              </p>
              <ol className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => jump(s.id)} className="focus-ring rounded text-[13px] text-fg-2 hover:text-fg">
                      <span className="num mr-1 text-fg-3">{i + 1}.</span>
                      {s.text}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </header>

        <div ref={bodyRef} className="doc mt-6 max-w-[70ch]">
          <Body />
        </div>

        <nav aria-label={t('上一篇與下一篇', 'Previous and next')} className="mt-12 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
          {prev ? (
            <a href={href(`#/docs/${prev.slug}`)} className="focus-ring group rounded-lg border border-border px-4 py-3 transition-transform duration-150 hover:bg-muted active:scale-[0.98]">
              <span className="flex items-center gap-1 text-[12px] text-fg-3">
                <ArrowLeft className="size-3.5" aria-hidden />
                {t('上一篇', 'Previous')}
              </span>
              <span className="mt-0.5 block text-[14px] font-medium">{prev.title[lang]}</span>
            </a>
          ) : (
            <span />
          )}
          {next ? (
            <a href={href(`#/docs/${next.slug}`)} className="focus-ring group rounded-lg border border-border px-4 py-3 text-right transition-transform duration-150 hover:bg-muted active:scale-[0.98]">
              <span className="flex items-center justify-end gap-1 text-[12px] text-fg-3">
                {t('下一篇', 'Next')}
                <ArrowRight className="size-3.5" aria-hidden />
              </span>
              <span className="mt-0.5 block text-[14px] font-medium">{next.title[lang]}</span>
            </a>
          ) : null}
        </nav>
      </article>

      {sections.length ? (
        <aside className="hidden xl:sticky xl:top-24 xl:block xl:self-start">
          <p className="flex items-center gap-1.5 text-[12px] font-medium tracking-[0.04em] text-fg-3">
            <ListTree className="size-3.5" aria-hidden />
            {t('本篇內容', 'On this page')}
          </p>
          <ol className="mt-2 space-y-0.5 border-l border-border">
            {sections.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => jump(s.id)}
                  className="focus-ring -ml-px block w-full border-l border-transparent py-1 pl-3 text-left text-[13px] leading-snug text-fg-3 transition-transform duration-150 hover:border-fg hover:text-fg active:scale-[0.99]"
                >
                  {s.text}
                </button>
              </li>
            ))}
          </ol>
        </aside>
      ) : null}
    </div>
  )
}
