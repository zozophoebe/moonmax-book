// Builds the real-platform views from three keyless sources:
//   C  the public chain     → every USDC movement in the receiving wallets (the backbone)
//   B  MoonPay webhooks     → which Pay Link each payment came from (the labels)
//   +  public Pay Link data → names, prices, and which wallets each Pay Link pays into

import type { Attribution, OutgoingTransfer, Receipt, ReceiptSource, ReceiptsView, ReceiptTotals, WalletRead } from '../src/types/receipts'
import type { PaylinkEntry, ReceivingWallet, SetupState } from '../src/types/setup'
import { readSolanaWallet, solscanTx, type ChainTransfer } from './chain'
import type { PlatformConfig } from './config'
import { FX_SOURCE, ratesFor, twdValue } from './fx'
import { tokenString, toUnits } from './money'
import { fetchPublicPaylink, toPreview } from './moonpay'
import { loadWebhookEvents, loadWebhookSecret, type StoredWebhookEvent } from './store'

export const HOOK_PATH = '/api/hook/moonpay'
const USDC_DECIMALS = 6
const PRICE_TOLERANCE_PCT = 3n // swaps and fees move the paid amount a little

export async function loadPaylinkEntries(config: PlatformConfig): Promise<PaylinkEntry[]> {
  return Promise.all(
    config.paylinks.map(async (p): Promise<PaylinkEntry> => {
      try {
        return { ...p, preview: toPreview(p.id, await fetchPublicPaylink(p.id)), error: null }
      } catch (e) {
        return { ...p, preview: null, error: e instanceof Error ? e.message : String(e) }
      }
    }),
  )
}

export function walletsFrom(entries: PaylinkEntry[]): ReceivingWallet[] {
  const byAddress = new Map<string, ReceivingWallet>()
  for (const e of entries) {
    for (const r of e.preview?.recipients ?? []) {
      const w = byAddress.get(r.address)
      if (w) {
        if (!w.paylinkIds.includes(e.id)) w.paylinkIds.push(e.id)
        continue
      }
      const solanaUsdc = r.engine === 'SOL' && r.token === 'USDC'
      byAddress.set(r.address, {
        chain: r.chain,
        engine: r.engine,
        address: r.address,
        paylinkIds: [e.id],
        readable: solanaUsdc,
        note: solanaUsdc
          ? null
          : r.engine === 'SOL'
            ? `目前只讀 USDC，這個錢包收的是 ${r.token}。`
            : `${r.chain} 的公開節點不提供歷史紀錄查詢，這條鏈的收款先靠 MoonPay 的通知（webhook）記錄。`,
      })
    }
  }
  return [...byAddress.values()]
}

export async function setupState(root: string, config: PlatformConfig): Promise<SetupState> {
  const paylinks = await loadPaylinkEntries(config)
  const secret = await loadWebhookSecret(root)
  const events = await loadWebhookEvents(root)
  return {
    checkedAt: new Date().toISOString(),
    paylinks,
    wallets: walletsFrom(paylinks),
    webhook: {
      configured: Boolean(secret?.sharedToken),
      tokenHint: secret?.sharedToken ? secret.sharedToken.slice(-4) : null,
      savedAt: secret?.savedAt ?? null,
      eventCount: events.length,
      lastEventAt: events.reduce<string | null>((m, e) => (!m || e.receivedAt > m ? e.receivedAt : m), null),
      hookPath: HOOK_PATH,
    },
    maxDepositAddresses: config.maxDepositAddresses,
  }
}

// ---------------------------------------------------------------------------

const CHAIN_NAME: Record<string, string> = { SOL: 'Solana', BASE: 'Base', ETH: 'Ethereum', POLYGON: 'Polygon', BTC: 'Bitcoin' }
const EXPLORER: Record<string, (sig: string) => string> = { Solana: solscanTx, Base: (h) => `https://basescan.org/tx/${h}` }

function attribute(
  t: ChainTransfer,
  event: StoredWebhookEvent | undefined,
  candidates: PaylinkEntry[],
): { key: string; attribution: Attribution } {
  if (!t.viaMoonPay) return { key: 'other', attribution: 'not-moonpay' }
  if (event?.paylinkId) return { key: event.paylinkId, attribution: 'webhook' }
  const first = candidates[0]
  if (candidates.length === 1 && first) return { key: first.id, attribution: 'only-paylink' }
  const paid = t.payerPaidUnits ?? t.amountUnits
  const matches = candidates.filter((c) => {
    if (!c.preview) return false
    const price = toUnits(c.preview.priceToken, USDC_DECIMALS)
    const diff = paid > price ? paid - price : price - paid
    return diff * 100n <= price * PRICE_TOLERANCE_PCT
  })
  const only = matches[0]
  if (matches.length === 1 && only) return { key: only.id, attribution: 'price-match' }
  return { key: 'unmatched', attribution: 'unmatched' }
}

export async function buildReceipts(root: string, config: PlatformConfig): Promise<ReceiptsView> {
  const entries = await loadPaylinkEntries(config)
  const wallets = walletsFrom(entries)
  const events = await loadWebhookEvents(root)
  const eventBySig = new Map(events.map((e) => [e.transactionSignature, e]))
  const maxAddresses = new Set(config.maxDepositAddresses.map((a) => a.address))

  const reads: WalletRead[] = []
  const transfers: ChainTransfer[] = []
  for (const w of wallets) {
    if (!w.readable) {
      reads.push({ chain: w.chain, address: w.address, readable: false, error: null, note: w.note })
      continue
    }
    try {
      transfers.push(...(await readSolanaWallet(root, w.address)))
      reads.push({ chain: w.chain, address: w.address, readable: true, error: null, note: null })
    } catch (e) {
      reads.push({ chain: w.chain, address: w.address, readable: true, error: e instanceof Error ? e.message : String(e), note: null })
    }
  }

  type Draft = Omit<Receipt, 'fxRateTwdPerUsd' | 'twdValue'> & { grossUnits: bigint; netUnits: bigint; feeUnits: bigint }
  const drafts: Draft[] = []
  const seen = new Set<string>()
  for (const t of transfers.filter((x) => x.direction === 'in')) {
    seen.add(t.signature)
    const candidates = entries.filter((e) => wallets.find((w) => w.address === t.wallet)?.paylinkIds.includes(e.id))
    const { key, attribution } = attribute(t, eventBySig.get(t.signature), candidates)
    const gross = t.payerPaidUnits ?? t.amountUnits
    drafts.push({
      id: t.signature,
      receivedAt: t.at,
      chain: 'Solana',
      token: 'USDC',
      wallet: t.wallet,
      grossToken: t.payerPaidUnits !== null ? tokenString(t.payerPaidUnits, USDC_DECIMALS) : null,
      feeToken: t.feeUnits !== null ? tokenString(t.feeUnits, USDC_DECIMALS) : null,
      netToken: tokenString(t.amountUnits, USDC_DECIMALS),
      sourceKey: key,
      attribution,
      verifiedOnChain: true,
      explorerUrl: solscanTx(t.signature),
      grossUnits: gross,
      netUnits: t.amountUnits,
      feeUnits: t.feeUnits ?? 0n,
    })
  }

  // Webhook-only payments: chains we can't read yet (Base), or not yet visible on chain.
  for (const e of events) {
    if (seen.has(e.transactionSignature) || !e.amountUnits || !['USDC', 'USDT'].includes(e.tokenSymbol ?? '')) continue
    const chain = CHAIN_NAME[e.chainSymbol ?? ''] ?? e.chainSymbol ?? '未知網路'
    const units = BigInt(e.amountUnits)
    drafts.push({
      id: e.transactionSignature,
      receivedAt: e.createdAt ?? e.receivedAt,
      chain,
      token: e.tokenSymbol ?? 'USDC',
      wallet: e.recipient ?? '',
      grossToken: tokenString(units, USDC_DECIMALS),
      feeToken: null,
      netToken: tokenString(units, USDC_DECIMALS),
      sourceKey: e.paylinkId ?? 'unmatched',
      attribution: e.paylinkId ? 'webhook' : 'unmatched',
      verifiedOnChain: false,
      explorerUrl: EXPLORER[chain]?.(e.transactionSignature) ?? '',
      grossUnits: units,
      netUnits: units,
      feeUnits: 0n,
    })
  }

  const rates = await ratesFor(root, drafts.map((d) => d.receivedAt))
  const receipts: Receipt[] = drafts
    .map(({ grossUnits, netUnits: _net, feeUnits: _fee, ...d }) => {
      const rate = rates.get(d.receivedAt) ?? null
      return { ...d, fxRateTwdPerUsd: rate, twdValue: rate ? twdValue(grossUnits, USDC_DECIMALS, rate) : null }
    })
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))

  // ---- sources (tabs) ----
  const units = new Map(drafts.map((d) => [d.id, d]))
  const summarize = (keep: (r: Receipt) => boolean): ReceiptTotals => {
    const rows = receipts.filter(keep)
    let gross = 0n
    let fee = 0n
    let net = 0n
    let twd = 0n
    let twdComplete = true
    for (const r of rows) {
      const u = units.get(r.id)
      gross += u?.grossUnits ?? 0n
      fee += u?.feeUnits ?? 0n
      net += u?.netUnits ?? 0n
      if (r.twdValue === null) twdComplete = false
      else twd += BigInt(r.twdValue)
    }
    return {
      count: rows.length,
      grossTotalToken: tokenString(gross, USDC_DECIMALS),
      feeTotalToken: tokenString(fee, USDC_DECIMALS),
      netTotalToken: tokenString(net, USDC_DECIMALS),
      twdTotal: twdComplete ? twd.toString() : null,
    }
  }
  const bySource = (key: string) => summarize((r) => r.sourceKey === key)

  const sources: ReceiptSource[] = entries.map((e) => ({
    key: e.id,
    kind: 'paylink',
    label: e.label ?? e.preview?.name ?? `Pay Link ${e.id.slice(0, 6)}…`,
    paylinkName: e.preview?.name ?? null,
    siteUrl: e.siteUrl,
    registered: true,
    ...bySource(e.id),
  }))
  const known = new Set(sources.map((s) => s.key))
  for (const key of new Set(receipts.map((r) => r.sourceKey))) {
    if (known.has(key) || key === 'unmatched' || key === 'other') continue
    sources.push({ key, kind: 'paylink', label: `還沒加入的 Pay Link ${key.slice(0, 6)}…`, paylinkName: null, siteUrl: null, registered: false, ...bySource(key) })
  }
  const unmatched = bySource('unmatched')
  if (unmatched.count) sources.push({ key: 'unmatched', kind: 'unmatched', label: '分不出是哪個 Pay Link', paylinkName: null, siteUrl: null, registered: true, ...unmatched })
  const other = bySource('other')
  if (other.count) sources.push({ key: 'other', kind: 'other', label: '其他轉入', paylinkName: null, siteUrl: null, registered: true, ...other })

  const outgoing: OutgoingTransfer[] = transfers
    .filter((t) => t.direction === 'out')
    .map((t) => ({
      id: t.signature,
      sentAt: t.at,
      chain: 'Solana',
      token: 'USDC',
      amountToken: tokenString(t.amountUnits, USDC_DECIMALS),
      to: t.counterparty,
      toMax: Boolean(t.counterparty && maxAddresses.has(t.counterparty)),
      explorerUrl: solscanTx(t.signature),
    }))

  return {
    checkedAt: new Date().toISOString(),
    fxRateSource: FX_SOURCE,
    sources,
    totals: summarize((r) => r.sourceKey !== 'other'),
    receipts,
    outgoing,
    wallets: reads,
    webhookConfigured: Boolean((await loadWebhookSecret(root))?.sharedToken),
  }
}
