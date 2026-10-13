// MoonPay Commerce, without API keys:
//   - the public Pay Link endpoint (name, price, which wallets it pays into)
//   - webhooks, verified with the sharedToken (Bearer header + HMAC-SHA256 of the raw body)

import { createHmac, timingSafeEqual } from 'node:crypto'
import type { PaylinkPreview, PaylinkRecipient } from '../src/types/setup'
import { fetchWithTimeout } from './http'
import { LocalizedError, T } from './i18n'
import { unitsToDecimal } from './money'
import type { StoredWebhookEvent } from './store'

const MOONPAY_API = 'https://api.hel.io/v1'

type PublicCurrency = { symbol: string; decimals: number; mintAddress: string; blockchain?: { displayName?: string } }

export type PublicPaylink = {
  name: string
  disabled: boolean
  inactive: boolean
  normalizedPrice: string
  redirectUrl: string | null
  features: { canSwapTokens: boolean; canPayWithCard: boolean; requireEmail: boolean }
  currency: PublicCurrency
  wallet?: { publicKey?: string }
  recipients?: { currency?: PublicCurrency; wallet?: { publicKey?: string }; sourceBlockchainEngine?: { type?: string } }[]
  company?: { name?: string; kycVerified?: boolean; kybVerified?: boolean; isVerificationRequired?: boolean }
}

export class PaylinkNotFound extends LocalizedError {
  constructor() {
    super(T('MoonPay 找不到這個 Pay Link。', 'MoonPay could not find this Pay Link.'))
  }
}

const memo = new Map<string, { at: number; value: PublicPaylink }>()

export async function fetchPublicPaylink(id: string): Promise<PublicPaylink> {
  const hit = memo.get(id)
  if (hit && Date.now() - hit.at < 30_000) return hit.value
  const res = await fetchWithTimeout(`${MOONPAY_API}/paylink/${id}/public`)
  if (res.status === 404 || res.status === 400) throw new PaylinkNotFound()
  if (!res.ok) throw new LocalizedError(T(`MoonPay 回應 HTTP ${res.status}`, `MoonPay responded with HTTP ${res.status}`))
  // An unknown ID comes back as HTTP 200 with a null body, not a 404.
  const body = (await res.json().catch(() => null)) as PublicPaylink | null
  if (!body || typeof body.name !== 'string' || !body.currency) throw new PaylinkNotFound()
  memo.set(id, { at: Date.now(), value: body })
  return body
}

export function recipientsOf(pl: PublicPaylink): PaylinkRecipient[] {
  const out: PaylinkRecipient[] = []
  for (const r of pl.recipients ?? []) {
    const address = r.wallet?.publicKey
    if (!address) continue
    out.push({ chain: r.currency?.blockchain?.displayName ?? '—', engine: r.sourceBlockchainEngine?.type ?? '?', token: r.currency?.symbol ?? '?', address })
  }
  // Older Pay Links only carry the top-level wallet.
  if (!out.length && pl.wallet?.publicKey) {
    out.push({ chain: pl.currency.blockchain?.displayName ?? '—', engine: 'SOL', token: pl.currency.symbol, address: pl.wallet.publicKey })
  }
  return out
}

export function toPreview(id: string, pl: PublicPaylink): PaylinkPreview {
  return {
    id,
    name: pl.name,
    priceToken: unitsToDecimal(BigInt(pl.normalizedPrice), pl.currency.decimals),
    token: pl.currency.symbol,
    chain: pl.currency.blockchain?.displayName ?? '—',
    active: !pl.disabled && !pl.inactive,
    hostedUrl: `https://moonpay.hel.io/pay/${id}`,
    redirectUrl: pl.redirectUrl,
    requireEmail: pl.features.requireEmail,
    canSwapTokens: pl.features.canSwapTokens,
    canPayWithCard: pl.features.canPayWithCard,
    companyName: pl.company?.name ?? null,
    kycVerified: Boolean(pl.company?.kycVerified),
    kybVerified: Boolean(pl.company?.kybVerified),
    recipients: recipientsOf(pl),
  }
}

// ---------- webhooks ----------

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function verifyWebhook(rawBody: Buffer, authorization: string | null, signature: string | null, sharedToken: string): boolean {
  const bearer = safeEqual(authorization ?? '', `Bearer ${sharedToken}`)
  const expected = createHmac('sha256', sharedToken).update(rawBody).digest('hex')
  const signed = safeEqual((signature ?? '').toLowerCase(), expected)
  return bearer && signed
}

type PaylinkWebhookBody = {
  event?: string
  transaction?: string
  transactionObject?: {
    id?: string
    paylinkId?: string
    fee?: string
    createdAt?: string
    meta?: {
      amount?: string
      totalAmount?: string
      recipientPK?: string
      transactionSignature?: string
      transactionStatus?: string
      currency?: { symbol?: string; blockchain?: { symbol?: string } }
    }
  }
}

// Keeps what the ledger needs and nothing else: meta.customerDetails (email, name,
// address, phone) is never read, so it is never stored.
export function extractWebhookEvent(body: PaylinkWebhookBody): StoredWebhookEvent | null {
  let tx = body.transactionObject
  if (!tx && typeof body.transaction === 'string') {
    try {
      tx = JSON.parse(body.transaction) as PaylinkWebhookBody['transactionObject']
    } catch {
      tx = undefined
    }
  }
  const meta = tx?.meta
  if (!tx || !meta?.transactionSignature || (meta.transactionStatus && meta.transactionStatus !== 'SUCCESS')) return null
  return {
    transactionSignature: meta.transactionSignature,
    helioTransactionId: tx.id ?? null,
    paylinkId: tx.paylinkId ?? null,
    chainSymbol: meta.currency?.blockchain?.symbol ?? null,
    tokenSymbol: meta.currency?.symbol ?? null,
    amountUnits: meta.totalAmount ?? meta.amount ?? null,
    feeUnits: tx.fee ?? null,
    recipient: meta.recipientPK ?? null,
    createdAt: tx.createdAt ?? null,
    receivedAt: new Date().toISOString(),
  }
}
