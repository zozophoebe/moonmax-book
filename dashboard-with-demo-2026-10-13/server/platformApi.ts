// Dev-only local API for the real platform. No MoonPay API keys anywhere:
// payments are read from the public chain and labelled by MoonPay webhooks.

import type { IncomingMessage } from 'node:http'
import type { Plugin } from 'vite'
import type { AnnualSummary, Creator, SourceStatus } from '../src/types/ledger'
import { cleanLabel, isSolanaAddress, loadConfig, normalizeUrl, parsePaylinkId, saveConfig } from './config'
import { detectPlatform } from './detect'
import { fetchWithTimeout } from './http'
import { buildReceipts, HOOK_PATH, setupState } from './ledger'
import { extractWebhookEvent, fetchPublicPaylink, PaylinkNotFound, verifyWebhook } from './moonpay'
import { clearWebhookSecret, loadWebhookSecret, saveWebhookSecret, upsertWebhookEvent } from './store'

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

function emptySummary(year: number): AnnualSummary {
  return {
    year,
    asOf: new Date().toISOString(),
    matchingMethod: 'FIFO',
    fxRateSource: '中央銀行每日參考匯率',
    incomeEventCount: 0,
    cashoutEventCount: 0,
    totalIncomeTwd: '0',
    totalRealizedGainTwd: '0',
    totalRealizedLossTwd: '0',
    totalCashoutTwd: '0',
    stillHeld: [],
    unreconciledCashoutIds: [],
  }
}

const isLocalHost = (host: string | undefined) => /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host ?? '')

// Writes must come from this app's own pages: a JSON body (forces a CORS preflight for
// cross-site callers) and an Origin header that matches this server.
function assertSameOrigin(req: IncomingMessage) {
  const origin = req.headers.origin
  const host = req.headers.host
  let ok = false
  try {
    ok = Boolean(origin && host && isLocalHost(host) && new URL(origin).host === host)
  } catch {
    ok = false
  }
  if (!ok) throw new HttpError(403, '只接受從 MoonMax Book 本機頁面送出的修改。')
  if (req.method !== 'DELETE' && !String(req.headers['content-type'] ?? '').includes('application/json')) {
    throw new HttpError(415, '需要 JSON。')
  }
}

async function readRaw(req: IncomingMessage, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > limit) throw new HttpError(413, '內容太大。')
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks)
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const raw = await readRaw(req, 10_000)
  if (!raw.length) return {}
  try {
    return JSON.parse(raw.toString('utf8')) as Record<string, unknown>
  } catch {
    throw new HttpError(400, 'JSON 格式錯誤。')
  }
}

async function checkSite(input: unknown): Promise<string | null> {
  if (typeof input !== 'string' || !input.trim()) return null
  const url = normalizeUrl(input)
  if (!url) throw new HttpError(400, '網站網址格式不對，請用 https:// 開頭的網址。')
  try {
    const res = await fetchWithTimeout(url)
    if (!res.ok) throw new HttpError(422, `網站回應 HTTP ${res.status}，確認網址打得開。`)
  } catch (e) {
    if (e instanceof HttpError) throw e
    throw new HttpError(422, '連不到這個網站，確認它已經上線。')
  }
  return url
}

export function platformApi(): Plugin {
  return {
    name: 'moonmax-book-platform-api',
    configureServer(server) {
      const root = server.config.root

      type Handler = (req: IncomingMessage, q: URLSearchParams) => Promise<unknown>
      const routes: Record<string, Partial<Record<Method, Handler>>> = {
        '/api/setup': { GET: async () => setupState(root, await loadConfig(root)) },

        '/api/setup/paylinks': {
          POST: async (req) => {
            const body = await readBody(req)
            const id = parsePaylinkId(String(body.input ?? ''))
            if (!id) throw new HttpError(400, '看不到 Pay Link ID。它是 24 個英文字母和數字，通常在付款網址 moonpay.hel.io/pay/ 的後面。')
            const config = await loadConfig(root)
            if (config.paylinks.some((p) => p.id === id)) throw new HttpError(409, '這個 Pay Link 已經加過了。')
            try {
              await fetchPublicPaylink(id)
            } catch (e) {
              if (e instanceof PaylinkNotFound) throw new HttpError(404, `格式對了，但 MoonPay 找不到 ${id} 這個 Pay Link。確認你複製的是自己帳號裡的付款連結。`)
              throw new HttpError(502, e instanceof Error ? e.message : String(e))
            }
            const siteUrl = await checkSite(body.siteUrl)
            config.paylinks.push({ id, label: cleanLabel(body.label), siteUrl, addedAt: new Date().toISOString() })
            await saveConfig(root, config)
            return setupState(root, config)
          },
          PATCH: async (req) => {
            const body = await readBody(req)
            const config = await loadConfig(root)
            const p = config.paylinks.find((x) => x.id === body.id)
            if (!p) throw new HttpError(404, '找不到這個 Pay Link。')
            if ('label' in body) p.label = cleanLabel(body.label)
            if ('siteUrl' in body) p.siteUrl = await checkSite(body.siteUrl)
            await saveConfig(root, config)
            return setupState(root, config)
          },
          DELETE: async (_req, q) => {
            const config = await loadConfig(root)
            config.paylinks = config.paylinks.filter((p) => p.id !== q.get('id'))
            await saveConfig(root, config)
            return setupState(root, config)
          },
        },

        '/api/setup/webhook': {
          POST: async (req) => {
            const token = String((await readBody(req)).sharedToken ?? '').trim()
            if (token.length < 16 || /\s/.test(token) || token.includes('*')) {
              throw new HttpError(400, '這不像完整的 Secret。到 MoonPay 的 Add Endpoint 表單，按 Secret 欄位右邊的複製鈕再貼一次（畫面上顯示的 ***** 是遮住的部分，要用複製鈕才拿得到完整的）。')
            }
            await saveWebhookSecret(root, token)
            return setupState(root, await loadConfig(root))
          },
          DELETE: async () => {
            await clearWebhookSecret(root)
            return setupState(root, await loadConfig(root))
          },
        },

        '/api/setup/max-address': {
          POST: async (req) => {
            const address = String((await readBody(req)).address ?? '').trim()
            if (!isSolanaAddress(address)) {
              throw new HttpError(400, '這不像 Solana 地址。Solana 地址是 32–44 個字元，不會有 0、O、I、l，也不會是 0x 開頭（0x 開頭的是 Ethereum／Base 地址）。')
            }
            const config = await loadConfig(root)
            config.maxDepositAddresses = [
              ...config.maxDepositAddresses.filter((a) => a.chain !== 'solana'),
              { chain: 'solana', token: 'USDC', address, addedAt: new Date().toISOString() },
            ]
            await saveConfig(root, config)
            return setupState(root, config)
          },
          DELETE: async () => {
            const config = await loadConfig(root)
            config.maxDepositAddresses = config.maxDepositAddresses.filter((a) => a.chain !== 'solana')
            await saveConfig(root, config)
            return setupState(root, config)
          },
        },

        '/api/platform/status': { GET: async () => detectPlatform(root, await loadConfig(root)) },
        '/api/real/receipts': { GET: async () => buildReceipts(root, await loadConfig(root)) },

        '/api/real/creator': {
          GET: async (): Promise<Creator> => {
            const config = await loadConfig(root)
            const first = config.paylinks[0]
            let company: string | undefined
            if (first) {
              try {
                company = (await fetchPublicPaylink(first.id)).company?.name
              } catch {
                company = undefined
              }
            }
            const n = config.paylinks.length
            return { id: 'real', displayName: company ?? '新的使用者', studioName: n ? `${n} 個收款來源` : '尚未設定' }
          },
        },
        // Valuation into the annual statement and FIFO (ledger/02–03) are not wired to real data yet.
        '/api/real/summary': { GET: async (_req, q) => emptySummary(Number(q.get('year')) || new Date().getFullYear()) },
        '/api/real/income-events': { GET: async () => [] },
        '/api/real/cashout-events': { GET: async () => [] },
        '/api/real/deposit-addresses': { GET: async () => (await loadConfig(root)).maxDepositAddresses },
        '/api/real/source-status': {
          GET: async (): Promise<SourceStatus> => {
            const config = await loadConfig(root)
            return {
              moonpayCommerce: { connected: config.paylinks.length > 0, lastSyncedAt: null },
              max: { method: 'none', lastImportedAt: null, fileName: null },
            }
          },
        },
      }

      // MoonPay → us. Authenticated by the endpoint's Secret (the docs call it sharedToken), not by Origin.
      async function handleHook(req: IncomingMessage): Promise<unknown> {
        if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
        const secret = await loadWebhookSecret(root)
        if (!secret?.sharedToken) throw new HttpError(503, 'Webhook not configured')
        const raw = await readRaw(req, 64_000)
        if (!verifyWebhook(raw, req.headers, secret.sharedToken)) throw new HttpError(401, 'Invalid signature')
        let body: unknown
        try {
          body = JSON.parse(raw.toString('utf8'))
        } catch {
          throw new HttpError(400, 'Invalid JSON')
        }
        const event = extractWebhookEvent(body as Parameters<typeof extractWebhookEvent>[0])
        if (event) await upsertWebhookEvent(root, event)
        return { ok: true, stored: Boolean(event) }
      }

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        // Reached through a tunnel (e.g. cloudflared): only the webhook endpoint is public.
        if (!isLocalHost(req.headers.host) && url.pathname !== HOOK_PATH) {
          res.statusCode = 403
          res.end('Forbidden')
          return
        }
        // data/ holds the webhook token and received events; never serve it as a static file.
        if (url.pathname === '/data' || url.pathname.startsWith('/data/') || url.pathname.includes('/data/webhook')) {
          res.statusCode = 404
          res.end('Not found')
          return
        }
        if (!url.pathname.startsWith('/api/')) return next()
        res.setHeader('content-type', 'application/json; charset=utf-8')
        const method = (req.method ?? 'GET') as Method
        try {
          if (url.pathname === HOOK_PATH) {
            res.end(JSON.stringify(await handleHook(req)))
            return
          }
          const handler = routes[url.pathname]?.[method]
          if (!handler) throw new HttpError(404, `沒有這個 API：${method} ${url.pathname}`)
          if (method !== 'GET') assertSameOrigin(req)
          res.end(JSON.stringify(await handler(req, url.searchParams)))
        } catch (e) {
          res.statusCode = e instanceof HttpError ? e.status : 500
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }))
        }
      })
    },
  }
}
