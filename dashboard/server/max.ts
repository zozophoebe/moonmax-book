// MAX cash-out reconciliation from MAX's own CSV export ("funds history": Date, Currency,
// Amount, Txid, Status). Each deposit is checked on chain by its Txid:
//   - USDC/USDT sent from a receiving wallet is matched first-in-first-out to MoonPay income,
//     and its TWD value on the deposit day is compared with its TWD value when received
//     (the exchange-rate difference);
//   - everything else is marked as an extra transfer: other coins (e.g. SOL), deposits from
//     other wallets, or more USDC than MoonPay income covers.
// Sale proceeds aren't in this export; until a trade CSV is supported, the deposit-day rate
// stands in for the sale (and is labelled as an estimate).

import type { ExtraKind, MaxImportResult, ReconLot, ReconRow, ReconView } from '../src/types/max'
import type { PlatformConfig } from './config'
import { ratesFor } from './fx'
import { fetchWithTimeout } from './http'
import { LocalizedError, T, type Lang } from './i18n'
import { buildReceipts } from './ledger'
import { tokenString, toUnits } from './money'
import type { Storage } from './storage'
import { loadCache, saveCache } from './store'

const KEY = 'max.funds'
const DECIMALS = 6
const STABLES = new Set(['USDC', 'USDT'])

export type MaxRecord = { txid: string; at: string; currency: string; amount: string; status: string; file: string }
type MaxStore = { records: MaxRecord[]; files: { name: string; rows: number; importedAt: string }[] }

const loadStore = async (storage: Storage): Promise<MaxStore> => (await storage.get<MaxStore>(KEY)) ?? { records: [], files: [] }
export const clearMax = (storage: Storage) => storage.del([KEY])
export const maxTxids = async (storage: Storage) => new Set((await loadStore(storage)).records.map((r) => r.txid))
// One transaction can carry several rows (USDC plus a little SOL), so a row is its Txid + coin + amount.
const recordKey = (r: Pick<MaxRecord, 'txid' | 'currency' | 'amount'>) => `${r.txid}|${r.currency}|${r.amount}`
export async function maxImportStatus(storage: Storage) {
  const s = await loadStore(storage)
  return { files: s.files.length, records: s.records.length, lastImportedAt: s.files.reduce<string | null>((m, f) => (!m || f.importedAt > m ? f.importedAt : m), null) }
}

// ---------- CSV ----------

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      if (row.some((c) => c.trim())) rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  row.push(cell)
  if (row.some((c) => c.trim())) rows.push(row)
  return rows
}

const HEADERS: Record<keyof Omit<MaxRecord, 'file'>, string[]> = {
  at: ['date', 'time', 'datetime', '日期', '時間'],
  currency: ['currency', 'coin', 'asset', '幣別', '幣種', '幣'],
  amount: ['amount', 'volume', 'quantity', '數量', '金額'],
  txid: ['txid', 'tx id', 'txhash', 'tx hash', 'transaction id', '交易id', '交易編號', '交易序號'],
  status: ['status', '狀態'],
}

// "2026-10-13 09:34:36 +0800" → ISO
function toIso(raw: string): string | null {
  const m = raw.trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(Z|[+-]\d{2}:?\d{2})?$/)
  if (!m) return null
  const [, y, mo, d, h, mi, s = '00', tz = '+0800'] = m
  const zone = tz === 'Z' ? 'Z' : `${tz.slice(0, 3)}:${tz.slice(-2)}`
  const t = Date.parse(`${y}-${mo!.padStart(2, '0')}-${d!.padStart(2, '0')}T${h!.padStart(2, '0')}:${mi}:${s}${zone}`)
  return Number.isFinite(t) ? new Date(t).toISOString() : null
}

export async function importMaxCsv(storage: Storage, fileName: string, text: string): Promise<MaxImportResult> {
  const rows = parseCsv(text)
  const header = (rows[0] ?? []).map((h) => h.trim().toLowerCase())
  const col = (k: keyof typeof HEADERS) => header.findIndex((h) => HEADERS[k].includes(h))
  const idx = { at: col('at'), currency: col('currency'), amount: col('amount'), txid: col('txid'), status: col('status') }
  if (idx.at < 0 || idx.currency < 0 || idx.amount < 0 || idx.txid < 0) {
    throw new LocalizedError(
      T(
        `看不懂這個 CSV 的欄位（${(rows[0] ?? []).join(', ') || '空的'}）。目前支援 MAX 的「資金紀錄」匯出：Date, Currency, Amount, Txid, Status。`,
        `Can’t read this CSV’s columns (${(rows[0] ?? []).join(', ') || 'empty'}). Supported for now: MAX’s funds-history export — Date, Currency, Amount, Txid, Status.`,
      ),
    )
  }
  const store = await loadStore(storage)
  const known = new Set(store.records.map(recordKey))
  let added = 0
  let duplicates = 0
  let skipped = 0
  for (const r of rows.slice(1)) {
    const txid = (r[idx.txid] ?? '').trim()
    const at = toIso(r[idx.at] ?? '')
    const amount = (r[idx.amount] ?? '').trim().replace(/,/g, '')
    if (!txid || !at || !/^-?\d+(\.\d+)?$/.test(amount)) {
      skipped++
      continue
    }
    const currency = (r[idx.currency] ?? '').trim().toUpperCase()
    const key = recordKey({ txid, currency, amount })
    if (known.has(key)) {
      duplicates++
      continue
    }
    known.add(key)
    store.records.push({ txid, at, currency, amount, status: idx.status >= 0 ? (r[idx.status] ?? '').trim().toLowerCase() : 'done', file: fileName })
    added++
  }
  store.files = [...store.files.filter((f) => f.name !== fileName), { name: fileName, rows: rows.length - 1, importedAt: new Date().toISOString() }]
  await storage.set(KEY, store)
  return { added, duplicates, skipped, total: store.records.length }
}

// ---------- chain lookup for deposits we don't already know ----------

type PayerCache = Record<string, { payer: string | null } | null>

async function payersOf(storage: Storage, txids: string[]): Promise<PayerCache> {
  const cache = await loadCache<PayerCache>(storage, 'solana-payer', {})
  let changed = false
  for (const sig of txids) {
    if (cache[sig] !== undefined) continue
    try {
      const res = await fetchWithTimeout('https://api.mainnet-beta.solana.com', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTransaction', params: [sig, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }] }),
      })
      const body = (await res.json()) as { result?: { transaction: { message: { accountKeys: { pubkey: string; signer?: boolean }[] } } } | null }
      const keys = body.result?.transaction.message.accountKeys ?? []
      if (!body.result) continue // not found (other chain, or not final yet): ask again next time
      cache[sig] = { payer: keys.find((k) => k.signer)?.pubkey ?? keys[0]?.pubkey ?? null }
      changed = true
    } catch {
      // Network trouble: leave it for next time.
    }
  }
  if (changed) await saveCache(storage, 'solana-payer', cache)
  return cache
}

// ---------- reconciliation ----------

const RATE_DP = 4n
const rateScaled = (rate: string) => {
  const [i = '0', f = ''] = rate.split('.')
  return BigInt(i + f.padEnd(Number(RATE_DP), '0').slice(0, Number(RATE_DP)))
}
// token units (6 dp) × rate (4 dp) → TWD cents, rounded half up
const centsOf = (units: bigint, rate: string) => {
  const scale = 10n ** (BigInt(DECIMALS) + RATE_DP - 2n)
  return (units * rateScaled(rate) + scale / 2n) / scale
}
const twd = (cents: bigint) => {
  const neg = cents < 0n
  const a = neg ? -cents : cents
  return `${neg ? '-' : ''}${a / 100n}.${(a % 100n).toString().padStart(2, '0')}`
}

type Lot = { receiptId: string; receivedAt: string; sourceKey: string; token: string; left: bigint; qty: bigint; costCents: bigint; rate: string }

export async function reconcile(storage: Storage, config: PlatformConfig, lang: Lang): Promise<ReconView> {
  const store = await loadStore(storage)
  const view = await buildReceipts(storage, config, lang)
  const receiving = new Set(view.wallets.map((w) => w.address))
  const outgoing = new Map(view.outgoing.map((o) => [o.id, o]))

  // Income lots: every MoonPay payment (not plain transfers in), oldest first, per token.
  const lots = new Map<string, Lot[]>()
  for (const r of [...view.receipts].filter((r) => r.sourceKey !== 'other' && r.fxRateTwdPerUsd).sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))) {
    const qty = toUnits(r.netToken, DECIMALS)
    const lot: Lot = { receiptId: r.id, receivedAt: r.receivedAt, sourceKey: r.sourceKey, token: r.token, left: qty, qty, costCents: centsOf(qty, r.fxRateTwdPerUsd!), rate: r.fxRateTwdPerUsd! }
    lots.set(r.token, [...(lots.get(r.token) ?? []), lot])
  }

  const records = [...store.records].sort((a, b) => a.at.localeCompare(b.at))
  const unknown = [...new Set(records.filter((d) => !outgoing.has(d.txid)).map((d) => d.txid))]
  const payers = unknown.length ? await payersOf(storage, unknown) : {}
  const rates = await ratesFor(storage, records.map((d) => d.at))

  const rows: ReconRow[] = []
  let costTotal = 0n
  let valueTotal = 0n
  let matchedTotal = 0n
  let valueComplete = true
  // Extras keep MAX's own figures (SOL has 9 decimals, not 6), summed exactly per currency.
  const extras = new Map<string, string[]>()
  const addExtra = (currency: string, amount: string) => extras.set(currency, [...(extras.get(currency) ?? []), amount])
  const sumDecimals = (xs: string[]) => {
    const dp = Math.max(2, ...xs.map((x) => x.split('.')[1]?.length ?? 0))
    return tokenString(xs.reduce((s, x) => s + toUnits(x, dp), 0n), dp)
  }
  const detected = new Set<string>()

  for (const d of records) {
    const out = outgoing.get(d.txid)
    const fromWallet = out ? out.from : (payers[d.txid]?.payer ?? null)
    const from = fromWallet ? (receiving.has(fromWallet) ? 'receiving-wallet' : 'other-wallet') : 'not-found'
    if (out?.to) detected.add(out.to)
    const units = toUnits(d.amount.replace(/^-/, ''), DECIMALS)
    const row: ReconRow = {
      id: recordKey(d),
      txid: d.txid,
      at: d.at,
      currency: d.currency,
      amount: d.amount,
      status: d.status,
      origin: from,
      fromWallet,
      matched: null,
      extra: null,
    }
    const done = d.status === 'done' || d.status === 'completed' || d.status === '完成'
    const direction = d.amount.startsWith('-') ? 'out' : 'in'

    if (!done || direction === 'out' || d.currency === 'TWD') {
      rows.push(row)
      continue
    }

    let extraKind: ExtraKind | null = null
    let extraAmount = d.amount
    if (!STABLES.has(d.currency)) {
      extraKind = 'other-asset'
    } else if (from !== 'receiving-wallet') {
      extraKind = from === 'other-wallet' ? 'other-wallet' : 'not-found'
    } else {
      // Take this deposit out of MoonPay income, oldest first.
      let need = units
      const used: ReconLot[] = []
      let cost = 0n
      let value = 0n
      const rate = rates.get(d.at) ?? null
      for (const lot of lots.get(d.currency) ?? []) {
        if (need === 0n) break
        if (lot.left === 0n) continue
        const take = lot.left < need ? lot.left : need
        const part = (lot.costCents * take + lot.qty / 2n) / lot.qty
        lot.left -= take
        need -= take
        cost += part
        // Value each slice on its own, so cost and value round the same way.
        if (rate) value += centsOf(take, rate)
        used.push({ receiptId: lot.receiptId, receivedAt: lot.receivedAt, sourceKey: lot.sourceKey, amount: tokenString(take, DECIMALS), costTwd: twd(part), rateAtReceipt: lot.rate })
      }
      const matchedUnits = units - need
      if (matchedUnits > 0n) {
        costTotal += cost
        matchedTotal += matchedUnits
        if (!rate) valueComplete = false
        else valueTotal += value
        row.matched = {
          token: d.currency,
          amount: tokenString(matchedUnits, DECIMALS),
          lots: used,
          costTwd: twd(cost),
          rateAtDeposit: rate,
          valueTwd: rate ? twd(value) : null,
          fxDiffTwd: rate ? twd(value - cost) : null,
        }
      }
      if (need > 0n) {
        extraKind = 'beyond-income'
        extraAmount = tokenString(need, DECIMALS)
      }
    }
    if (extraKind) {
      row.extra = { kind: extraKind, currency: d.currency, amount: extraAmount }
      addExtra(d.currency, extraAmount)
    }
    rows.push(row)
  }

  const remaining = [...lots.entries()]
    .map(([token, ls]) => ({ token, amount: tokenString(ls.reduce((s, l) => s + l.left, 0n), DECIMALS) }))
    .filter((r) => r.amount !== '0.00')

  return {
    checkedAt: new Date().toISOString(),
    files: store.files,
    rows: rows.reverse(),
    totals: {
      matchedToken: tokenString(matchedTotal, DECIMALS),
      costTwd: twd(costTotal),
      valueTwd: valueComplete ? twd(valueTotal) : null,
      fxDiffTwd: valueComplete ? twd(valueTotal - costTotal) : null,
      extras: [...extras.entries()].map(([currency, xs]) => ({ currency, amount: sumDecimals(xs) })),
    },
    remainingIncome: remaining,
    detectedMaxAddresses: [...detected],
    maxAddressSet: config.maxDepositAddresses.some((a) => a.chain === 'solana'),
  }
}
