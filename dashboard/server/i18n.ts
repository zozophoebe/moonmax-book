// Server-side wording, in the language the page asks for (x-moonmax-lang header, default zh).
// Views send structured data where they can and let the frontend word it; only messages that
// have no structure (errors) are worded here.

export type Lang = 'zh' | 'en'
export type Text = { zh: string; en: string }

export const T = (zh: string, en: string): Text => ({ zh, en })
export const pick = (lang: Lang, t: Text) => (lang === 'en' ? t.en : t.zh)
export const langOf = (req: Request): Lang => (req.headers.get('x-moonmax-lang') === 'en' ? 'en' : 'zh')

// An error whose message can be shown to the creator in either language.
export class LocalizedError extends Error {
  constructor(readonly text: Text) {
    super(text.en)
  }
}

export const errorText = (lang: Lang, e: unknown, fallback: Text): string =>
  e instanceof LocalizedError ? pick(lang, e.text) : `${pick(lang, fallback)}${e instanceof Error && e.message ? `（${e.message}）` : ''}`
