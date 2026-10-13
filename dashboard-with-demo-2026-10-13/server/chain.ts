// Reads a receiving wallet's USDC history straight from the public Solana chain.
// No keys: wallet addresses and transactions are public. Parsed transactions are
// cached in data/ because a finalized transaction never changes.

import { fetchWithTimeout } from './http'
import { loadCache, saveCache } from './store'

const RPC = 'https://api.mainnet-beta.solana.com'
export const SOLANA_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
// MoonPay Commerce's on-chain payment program (seen in its SinglePayment transactions).
export const MOONPAY_COMMERCE_PROGRAM = 'ENicYBBNZQ91toN7ggmTxnDGZW14uv9UkumN7XBGeYJ4'
const SIGNATURE_LIMIT = 200

export type ChainTransfer = {
  signature: string
  at: string
  wallet: string
  direction: 'in' | 'out'
  amountUnits: bigint
  viaMoonPay: boolean
  payerPaidUnits: bigint | null
  feeUnits: bigint | null
  counterparty: string | null
}

// USDC balance change per owner, kept as strings so the cache is plain JSON.
type ParsedTx = { at: string; viaMoonPay: boolean; deltas: Record<string, string> }
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
    if (!res.ok) throw new Error(`Solana 節點回應 HTTP ${res.status}`)
    const body = (await res.json()) as { result?: T; error?: { message?: string } }
    if (body.error) throw new Error(`Solana 節點：${body.error.message ?? '未知錯誤'}`)
    return body.result as T
  }
}

function parseTx(tx: RpcTransaction): ParsedTx | null {
  if (!tx?.meta || tx.meta.err || !tx.blockTime) return null
  const deltas = new Map<string, bigint>()
  const add = (b: TokenBalance, sign: 1n | -1n) => {
    if (b.mint !== SOLANA_USDC || !b.owner) return
    deltas.set(b.owner, (deltas.get(b.owner) ?? 0n) + sign * BigInt(b.uiTokenAmount.amount))
  }
  for (const b of tx.meta.preTokenBalances ?? []) add(b, -1n)
  for (const b of tx.meta.postTokenBalances ?? []) add(b, 1n)
  const keys = tx.transaction.message.accountKeys.map((k) => (typeof k === 'string' ? k : k.pubkey))
  const viaMoonPay = keys.includes(MOONPAY_COMMERCE_PROGRAM) || (tx.meta.logMessages ?? []).some((l) => l.includes(MOONPAY_COMMERCE_PROGRAM))
  return {
    at: new Date(tx.blockTime * 1000).toISOString(),
    viaMoonPay,
    deltas: Object.fromEntries([...deltas].filter(([, v]) => v !== 0n).map(([k, v]) => [k, v.toString()])),
  }
}

function toTransfer(signature: string, wallet: string, p: ParsedTx): ChainTransfer | null {
  const own = BigInt(p.deltas[wallet] ?? '0')
  if (own === 0n) return null
  const others = Object.entries(p.deltas)
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
      direction: 'in',
      amountUnits: own,
      viaMoonPay: p.viaMoonPay,
      payerPaidUnits: p.viaMoonPay && paid > 0n ? paid : null,
      feeUnits: p.viaMoonPay ? fee : null,
      counterparty: senders[0]?.[0] ?? null,
    }
  }
  const receivers = others.filter(([, v]) => v > 0n).sort((a, b) => (a[1] > b[1] ? -1 : 1))
  return { signature, at: p.at, wallet, direction: 'out', amountUnits: -own, viaMoonPay: p.viaMoonPay, payerPaidUnits: null, feeUnits: null, counterparty: receivers[0]?.[0] ?? null }
}

// Short in-memory memo so several page requests in a row don't re-hit the public node.
const recent = new Map<string, { at: number; transfers: ChainTransfer[] }>()

export async function readSolanaWallet(root: string, wallet: string): Promise<ChainTransfer[]> {
  const hit = recent.get(wallet)
  if (hit && Date.now() - hit.at < 60_000) return hit.transfers

  const accounts = await rpc<{ value: { pubkey: string }[] }>('getTokenAccountsByOwner', [wallet, { mint: SOLANA_USDC }, { encoding: 'jsonParsed' }])
  const signatures = new Set<string>()
  for (const { pubkey } of accounts.value) {
    const sigs = await rpc<{ signature: string; err: unknown }[]>('getSignaturesForAddress', [pubkey, { limit: SIGNATURE_LIMIT }])
    for (const s of sigs) if (!s.err) signatures.add(s.signature)
  }

  const cache = await loadCache<TxCache>(root, 'solana-tx', {})
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
  if (added) await saveCache(root, 'solana-tx', cache)

  const transfers = [...signatures]
    .map((sig) => {
      const p = cache[sig]
      return p ? toTransfer(sig, wallet, p) : null
    })
    .filter((t): t is ChainTransfer => t !== null)
    .sort((a, b) => b.at.localeCompare(a.at))
  recent.set(wallet, { at: Date.now(), transfers })
  return transfers
}

export const solscanTx = (signature: string) => `https://solscan.io/tx/${signature}`
