import { getLang } from '../i18n'

// Transport to the API (server/api.ts): the Vite dev server locally, a Vercel Function when deployed.

export class ApiError extends Error {
  readonly source: string
  constructor(source: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.source = source
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string; code?: string } | null
    // Session expired on the deployed site: reload into the login screen.
    if (res.status === 401 && body?.code === 'auth') window.location.reload()
    throw new ApiError('MoonMax Book', body?.error ?? `HTTP ${res.status}`)
  }
  return (await res.json()) as T
}

// The server words its messages in the language the page is showing.
const langHeader = () => ({ 'x-moonmax-lang': getLang() })

export async function getJson<T>(path: string): Promise<T> {
  return parse<T>(await fetch(path, { headers: langHeader() }))
}

export async function sendJson<T>(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<T> {
  return parse<T>(
    await fetch(path, {
      method,
      headers: { 'content-type': 'application/json', ...langHeader() },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  )
}
