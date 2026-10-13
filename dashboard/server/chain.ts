// Reads a receiving wallet's stablecoin history (USDC, USDT) straight from the public Solana chain.
// No keys: wallet addresses and transactions are public. Parsed transactions are
// cached in data/ because a finalized transaction never changes.

import { fetchWithTimeout } from './http'
import { LocalizedError, T } from './i18n'
import type { Storage } from './storage'
import { loadCache, saveCache } from './store'

const RPC = 'https://api.mainnet-beta.solana.com'
export const SOLANA_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
export const SOLANA_USDT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
// Both 6 decimals. A Pay Link can let buyers pay in either, so both must be read.
const MINTS: Record<string, 'USDC' | 'USDT'> = { [SOLANA_USDC]: 'USDC', [SOLANA_USDT]: 'USDT' }
// MoonPay Commerce's on-chain payment program (seen in its SinglePayment transactions).
export const MOONPAY_COMMERCE_PROGRAM = 'ENicYBBNZQ91toN7ggmTxnDGZW14uv9UkumN7XBGeYJ4'
const SIGNATURE_LIMIT = 200

export type ChainTransfer = {
  signature: string
  at: string
  wallet: string
  token: 'USDC' | 'USDT'
  direction: 'in' | 'out'
  amountUnits: bigint
  viaMoonPay: boolean
  payerPaidUnits: bigint | null
  feeUnits: bigint | null
  counterparty: string | null
}

// Balance change per token, per owner — strings so the cache is plain JSON.
type ParsedTx = { at: string; viaMoonPay: boolean; deltas: Record<string, Record<string, string>> }
type TxCache = Record<string, ParsedTx | null>

type TokenBalance = { mint: string; owner?: string; uiTokenAmount: { amount: string } }
type RpcTransaction = {
  blockTime: number | null
  meta: { err: unknown; preTokenBalances?: TokenBalance[]; postTokenBalances?: TokenBalance[]; logMessages?: string[] } | null
  transaction: { message: { accountKeys: (string | { pubkey: string })[] } }
} | null

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetchWithTimeout(RPC, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    })
    if (res.status === 429 && attempt < 4) {
      await new Promise((r) => setTimeout(r, 700 * (attempt + 1)))
      continue
    }
    if (!res.ok) throw new LocalizedError(T(`Solana 節點回應 HTTP ${res.status}`, `The Solana node responded with HTTP ${res.status}`))
    const body = (await res.json()) as { result?: T; error?: { message?: string } }
    if (body.error) throw new LocalizedError(T(`Solana 節點：${body.error.message ?? '未知錯誤'}`, `Solana node: ${body.error.message ?? 'unknown error'}`))
    return body.result as T
  }
}

function parseTx(tx: RpcTransaction): ParsedTx | null {
  if (!tx?.meta || tx.meta.err || !tx.blockTime) return null
  const deltas = new Map<string, Map<string, bigint>>()
  const add = (b: TokenBalance, sign: 1n | -1n) => {
    const token = MINTS[b.mint]
    if (!token || !b.owner) return
    const byOwner = deltas.get(token) ?? new Map<string, bigint>()
    byOwner.set(b.owner, (byOwner.get(b.owner) ?? 0n) + sign * BigInt(b.uiTokenAmount.amount))
    deltas.set(token, byOwner)
  }
  for (const b of tx.meta.preTokenBalances ?? []) add(b, -1n)
  for (const b of tx.meta.postTokenBalances ?? []) add(b, 1n)
  const keys = tx.transaction.message.accountKeys.map((k) => (typeof k === 'string' ? k : k.pubkey))
  const viaMoonPay = keys.includes(MOONPAY_COMMERCE_PROGRAM) || (tx.meta.logMessages ?? []).some((l) => l.includes(MOONPAY_COMMERCE_PROGRAM))
  return {
    at: new Date(tx.blockTime * 1000).toISOString(),
    viaMoonPay,
    deltas: Object.fromEntries(
      [...deltas].map(([token, byOwner]) => [token, Object.fromEntries([...byOwner].filter(([, v]) => v !== 0n).map(([k, v]) => [k, v.toString()]))]),
    ),
  }
}

function toTransfer(signature: string, wallet: string, p: ParsedTx, token: 'USDC' | 'USDT'): ChainTransfer | null {
  const byOwner = p.deltas[token] ?? {}
  const own = BigInt(byOwner[wallet] ?? '0')
  if (own === 0n) return null
  const others = Object.entries(byOwner)
    .filter(([owner]) => owner !== wallet)
    .map(([owner, v]) => [owner, BigInt(v)] as const)
  if (own > 0n) {
    const senders = others.filter(([, v]) => v < 0n).sort((a, b) => (a[1] < b[1] ? -1 : 1))
    const paid = senders.reduce((s, [, v]) => s - v, 0n)
    const fee = others.filter(([, v]) => v > 0n).reduce((s, [, v]) => s + v, 0n)
    return {
      signature,
      at: p.at,
      wallet,
      token,
      direction: 'in',
      amountUnits: own,
      viaMoonPay: p.viaMoonPay,
      payerPaidUnits: p.viaMoonPay && paid > 0n ? paid : null,
      feeUnits: p.viaMoonPay ? fee : null,
      counterparty: senders[0]?.[0] ?? null,
    }
  }
  const receivers = others.filter(([, v]) => v > 0n).sort((a, b) => (a[1] > b[1] ? -1 : 1))
  return { signature, at: p.at, wallet, token, direction: 'out', amountUnits: -own, viaMoonPay: p.viaMoonPay, payerPaidUnits: null, feeUnits: null, counterparty: receivers[0]?.[0] ?? null }
}

// Short in-memory memo so several page requests in a row don't re-hit the public node.
const recent = new Map<string, { at: number; transfers: ChainTransfer[] }>()

export async function readSolanaWallet(storage: Storage, wallet: string): Promise<ChainTransfer[]> {
  const hit = recent.get(wallet)
  if (hit && Date.now() - hit.at < 60_000) return hit.transfers

  const signatures = new Set<string>()
  const accounts: { pubkey: string }[] = []
  for (const mint of Object.keys(MINTS)) {
    accounts.push(...(await rpc<{ value: { pubkey: string }[] }>('getTokenAccountsByOwner', [wallet, { mint }, { encoding: 'jsonParsed' }])).value)
  }
  for (const { pubkey } of accounts) {
    const sigs = await rpc<{ signature: string; err: unknown }[]>('getSignaturesForAddress', [pubkey, { limit: SIGNATURE_LIMIT }])
    for (const s of sigs) if (!s.err) signatures.add(s.signature)
  }

  const cache = await loadCache<TxCache>(storage, 'solana-tx-v2', {})
  const missing = [...signatures].filter((s) => !cache[s])
  let added = 0
  for (const sig of missing) {
    // Sequential on purpose: the public node rate-limits bursts.
    const parsed = parseTx(await rpc<RpcTransaction>('getTransaction', [sig, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'finalized' }]))
    // Not finalized yet comes back empty; leave it uncached and try again next time.
    if (parsed) {
      cache[sig] = parsed
      added += 1
    }
  }
  if (added) await saveCache(storage, 'solana-tx-v2', cache)

  const transfers = [...signatures]
    .flatMap((sig) => {
      const p = cache[sig]
      return p ? (['USDC', 'USDT'] as const).map((token) => toTransfer(sig, wallet, p, token)) : []
    })
    .filter((t): t is ChainTransfer => t !== null)
    .sort((a, b) => b.at.localeCompare(a.at))
  recent.set(wallet, { at: Date.now(), transfers })
  return transfers
}

export const solscanTx = (signature: string) => `https://solscan.io/tx/${signature}`
