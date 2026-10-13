import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

// Two languages, words kept next to where they're used: t('中文', 'English').
export type Lang = 'zh' | 'en'
export type T = (zh: string, en: string) => string

const KEY = 'moonmax-lang'

function stored(): Lang | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'zh' || v === 'en' ? v : null
  } catch {
    return null
  }
}

// Module-level copy for code outside React (the API transport sends it to the server).
let current: Lang = stored() ?? 'zh'
export const getLang = () => current

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: current, setLang: () => {} })

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(current)
  const setLang = useCallback((l: Lang) => {
    current = l
    try {
      localStorage.setItem(KEY, l)
    } catch {
      // Private mode etc.: the choice just won't be remembered.
    }
    setLangState(l)
  }, [])
  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-Hant-TW'
  }, [lang])
  const value = useMemo(() => ({ lang, setLang }), [lang, setLang])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export const useLang = () => useContext(LangContext)

export function useT(): T {
  const { lang } = useLang()
  return useCallback((zh: string, en: string) => (lang === 'en' ? en : zh), [lang])
}

// Same, for anything (JSX with links and emphasis): tx(<>中文…</>, <>English…</>).
export function useTx() {
  const { lang } = useLang()
  return useCallback(<V,>(zh: V, en: V): V => (lang === 'en' ? en : zh), [lang])
}

export function LangToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang()
  const options: { key: Lang; label: string; aria: string }[] = [
    { key: 'zh', label: '中', aria: '中文' },
    { key: 'en', label: 'EN', aria: 'English' },
  ]
  return (
    <div role="group" aria-label="Language / 語言" className={`inline-flex rounded-lg border border-border bg-muted p-0.5 ${className}`}>
      {options.map((o) => {
        const active = o.key === lang
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={active}
            aria-label={o.aria}
            onClick={() => setLang(o.key)}
            className={`focus-ring h-7 min-w-9 rounded-md px-2 text-[12.5px] font-medium transition-transform duration-150 active:scale-[0.95] ${
              active ? 'bg-card text-fg shadow-sheet' : 'text-fg-3 hover:text-fg'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
