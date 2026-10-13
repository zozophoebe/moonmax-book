// Local dev only: serves the API (server/api.ts) from the Vite dev server, storing data in files.
// No login locally — only localhost can reach it. A tunnel (cloudflared) can reach the webhook only.

import type { IncomingMessage } from 'node:http'
import type { Plugin } from 'vite'
import { handleApi } from './api'
import { HOOK_PATH } from './ledger'
import { fileStorage } from './storage'

const isLocalHost = (host: string | undefined) => /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host ?? '')

async function readRaw(req: IncomingMessage, limit: number): Promise<Buffer | null> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > limit) return null
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks)
}

export function platformApi(): Plugin {
  return {
    name: 'moonmax-book-platform-api',
    configureServer(server) {
      const storage = fileStorage(server.config.root)

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        // Reached through a tunnel: only the webhook endpoint is public.
        if (!isLocalHost(req.headers.host) && url.pathname !== HOOK_PATH) {
          res.statusCode = 403
          res.end('Forbidden')
          return
        }
        // data/ holds the webhook Secret and received events; never serve it as a static file.
        if (url.pathname === '/data' || url.pathname.startsWith('/data/') || url.pathname.includes('/data/webhook')) {
          res.statusCode = 404
          res.end('Not found')
          return
        }
        if (!url.pathname.startsWith('/api/')) return next()

        const method = req.method ?? 'GET'
        // 2 MB covers MAX CSV uploads; the webhook route enforces its own 64 KB limit.
        const body = method === 'GET' || method === 'HEAD' ? null : await readRaw(req, 2_000_000)
        if (body === null && method !== 'GET' && method !== 'HEAD') {
          res.statusCode = 413
          res.end(JSON.stringify({ error: req.headers['x-moonmax-lang'] === 'en' ? 'Request too large.' : '內容太大。' }))
          return
        }
        const headers = new Headers()
        for (const [k, v] of Object.entries(req.headers)) if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(', ') : v)

        const response = await handleApi(
          new Request(`http://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`, { method, headers, body: body?.length ? new Uint8Array(body) : undefined }),
          { storage, runtime: 'local', auth: null },
        )
        res.statusCode = response.status
        response.headers.forEach((v, k) => res.setHeader(k, v))
        res.end(Buffer.from(await response.arrayBuffer()))
      })
    },
  }
}
