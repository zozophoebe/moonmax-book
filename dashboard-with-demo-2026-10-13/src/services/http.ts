// Real transport: the local API served by the dev server (server/platformApi.ts).

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
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new ApiError('本機 API', body?.error ?? `HTTP ${res.status}`)
  }
  return (await res.json()) as T
}

export async function getJson<T>(path: string): Promise<T> {
  return parse<T>(await fetch(path))
}

export async function sendJson<T>(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<T> {
  return parse<T>(
    await fetch(path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  )
}
