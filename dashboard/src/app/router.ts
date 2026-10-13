import { useEffect, useState } from 'react'

export type DocSlug = 'who' | 'moonpay' | 'cashout'
export type Route = { name: 'dashboard' } | { name: 'receipts' } | { name: 'docs'; slug: DocSlug }

const DOC_SLUGS: DocSlug[] = ['who', 'moonpay', 'cashout']

export function parseRoute(hash: string): Route {
  const [, section, slug] = hash.replace(/^#/, '').split('/')
  if (section === 'receipts') return { name: 'receipts' }
  if (section === 'docs') return { name: 'docs', slug: DOC_SLUGS.find((s) => s === slug) ?? 'who' }
  return { name: 'dashboard' }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash))
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(window.location.hash))
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

// Keeps the ?scenario= query while switching pages.
export const href = (hash: string) => `${window.location.search}${hash}`
