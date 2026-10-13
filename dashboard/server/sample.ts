// A made-up ledger, so people without MoonPay or MAX accounts (reviewers, the curious) can see
// what MoonMax Book does. Loading it writes ordinary settings, webhook events and MAX records
// into the signed-in account's own ledger; sampleSources then stands in for MoonPay, the chain
// and exchange rates. Everything downstream — attribution, TWD values, FIFO — is the real code.
//
// The story: a creator sells a Figma plugin (US$19) and an illustration pack (US$9) from one
// wallet, and an online course (US$49) from another. They set up MoonPay notifications in
// mid-September, so earlier payments are guesses. They top their wallet up once, move USDC to
// MAX three times, and also send MAX some SOL and 30 USDC from a personal wallet.

import { randomBytes } from 'node:crypto'
import type { PaylinkPreview } from '../src/types/setup'
import type { ChainTransfer } from './chain'
import type { PlatformConfig } from './config'
import { pick, T, type Lang } from './i18n'
import { seedMaxRecords, type MaxRecord } from './max'
import type { Sources } from './sources'
import { SAMPLE_KEY, saveWebhookEvent, saveWebhookSecret, type StoredWebhookEvent } from './store'
import type { Storage } from './storage'

const WALLET_SHOP = 'Samp1eShopWa11etAAAAAAAAAAAAAAAAAAAAAAAAAAA'
const WALLET_COURSE = 'Samp1eCourseWa11etBBBBBBBBBBBBBBBBBBBBBBBBB'
const WALLET_PERSONAL = 'Samp1ePersona1Wa11etCCCCCCCCCCCCCCCCCCCCCCC'
const MAX_ADDRESS = 'Samp1eMAXDepositAddressDDDDDDDDDDDDDDDDDDDD'
const COMPANY = 'Sample Studio'

const PAYLINKS = [
  { id: 'sample-plugin', name: 'Figma Plugin Pro', price: '19', wallet: WALLET_SHOP, label: T('Figma 外掛 Pro 版', 'Figma plugin Pro'), site: 'https://example.com/plugin' },
  { id: 'sample-pack', name: 'Illustration Pack', price: '9', wallet: WALLET_SHOP, label: T('插畫素材包', 'Illustration pack'), site: 'https://example.com/illustrations' },
  { id: 'sample-course', name: 'AI Website Course', price: '49', wallet: WALLET_COURSE, label: T('AI 網站線上課', 'AI website course'), site: 'https://example.com/course' },
] as const

const units = (usd: string) => {
  const [i = '0', f = ''] = usd.split('.')
  return BigInt(i + f.padEnd(6, '0').slice(0, 6))
}

// [n, time (UTC), Pay Link, notified by webhook]. MoonPay keeps 2%.
const PAYMENTS: [number, string, (typeof PAYLINKS)[number]['id'], boolean][] = [
  [1, '2026-08-03T06:12:41Z', 'sample-plugin', false],
  [2, '2026-08-10T11:05:09Z', 'sample-course', false],
  [3, '2026-08-17T02:47:33Z', 'sample-pack', false],
  [4, '2026-08-29T13:21:58Z', 'sample-plugin', false],
  [5, '2026-09-06T04:38:12Z', 'sample-pack', false],
  [7, '2026-09-14T07:16:45Z', 'sample-course', true],
  [8, '2026-09-21T12:09:30Z', 'sample-plugin', true],
  [9, '2026-10-02T03:55:17Z', 'sample-plugin', true],
  [10, '2026-10-05T10:40:02Z', 'sample-course', true],
]
const WEBHOOK_SAVED_AT = '2026-09-10T08:30:00Z'

function transfers(): ChainTransfer[] {
  const out: ChainTransfer[] = PAYMENTS.map(([n, at, id]) => {
    const pl = PAYLINKS.find((p) => p.id === id)!
    const gross = units(pl.price)
    const fee = (gross * 2n) / 100n
    return { signature: `sample-pay-${n}`, at, wallet: pl.wallet, token: 'USDC', direction: 'in', amountUnits: gross - fee, viaMoonPay: true, payerPaidUnits: gross, feeUnits: fee, counterparty: null }
  })
  // Not a sale: the creator topping up their own shop wallet.
  out.push({ signature: 'sample-topup-6', at: '2026-09-10T09:02:00Z', wallet: WALLET_SHOP, token: 'USDC', direction: 'in', amountUnits: units('20'), viaMoonPay: false, payerPaidUnits: null, feeUnits: null, counterparty: WALLET_PERSONAL })
  const send = (sig: string, at: string, wallet: string, usd: string): ChainTransfer => ({ signature: sig, at, wallet, token: 'USDC', direction: 'out', amountUnits: units(usd), viaMoonPay: false, payerPaidUnits: null, feeUnits: null, counterparty: MAX_ADDRESS })
  out.push(send('sample-out-1', '2026-09-01T03:20:00Z', WALLET_SHOP, '46.06'))
  out.push(send('sample-out-2', '2026-09-16T08:40:00Z', WALLET_COURSE, '96.04'))
  out.push(send('sample-out-3', '2026-10-08T05:10:00Z', WALLET_SHOP, '66.06'))
  return out.sort((a, b) => b.at.localeCompare(a.at))
}

// MAX's funds history: three deposits from the receiving wallets, plus two the creator sent themselves.
const MAX_RECORDS: Omit<MaxRecord, 'file'>[] = [
  { txid: 'sample-sol-1', at: '2026-09-01T03:05:00Z', currency: 'SOL', amount: '0.05', status: 'done' },
  { txid: 'sample-out-1', at: '2026-09-01T03:24:00Z', currency: 'USDC', amount: '46.06', status: 'done' },
  { txid: 'sample-out-2', at: '2026-09-16T08:44:00Z', currency: 'USDC', amount: '96.04', status: 'done' },
  { txid: 'sample-out-3', at: '2026-10-08T05:13:00Z', currency: 'USDC', amount: '66.06', status: 'done' },
  { txid: 'sample-extra-1', at: '2026-10-10T02:00:00Z', currency: 'USDC', amount: '30', status: 'done' },
]

// Made-up daily USD/TWD rates (Taipei dates).
const RATES: Record<string, string> = {
  '2026-08-03': '32.4130',
  '2026-08-10': '32.2865',
  '2026-08-17': '32.3512',
  '2026-08-29': '32.1240',
  '2026-09-01': '32.0518',
  '2026-09-06': '31.9874',
  '2026-09-10': '32.0236',
  '2026-09-14': '31.9012',
  '2026-09-16': '31.8645',
  '2026-09-21': '31.9420',
  '2026-10-02': '31.8817',
  '2026-10-05': '31.9530',
  '2026-10-08': '32.0954',
  '2026-10-10': '32.0412',
}
const taipeiDate = (iso: string) => new Date(Date.parse(iso) + 8 * 3600_000).toISOString().slice(0, 10)
const rateOn = (iso: string) => {
  const day = taipeiDate(iso)
  const known = Object.keys(RATES).filter((d) => d <= day).sort()
  const last = known[known.length - 1]
  return last ? (RATES[last] ?? null) : null
}

function preview(id: string): PaylinkPreview {
  const pl = PAYLINKS.find((p) => p.id === id)
  if (!pl) throw new Error(`not a sample Pay Link: ${id}`)
  return {
    id: pl.id,
    name: pl.name,
    priceToken: pl.price,
    token: 'USDC',
    chain: 'Solana',
    active: true,
    hostedUrl: '',
    redirectUrl: null,
    requireEmail: false,
    canSwapTokens: false,
    canPayWithCard: false,
    companyName: COMPANY,
    kycVerified: true,
    kybVerified: false,
    recipients: [{ chain: 'Solana', engine: 'SOL', token: 'USDC', address: pl.wallet }],
  }
}

export const sampleSources: Sources = {
  sample: true,
  paylink: async (id) => preview(id),
  companyName: async () => COMPANY,
  wallet: async (_storage, address) => transfers().filter((t) => t.wallet === address),
  rates: async (_storage, isoTimes) => new Map(isoTimes.map((iso) => [iso, rateOn(iso)])),
  payers: async (_storage, txids) => Object.fromEntries(txids.map((sig) => [sig, sig === 'sample-sol-1' || sig === 'sample-extra-1' ? { payer: WALLET_PERSONAL } : null])),
  explorer: () => '',
  labelFor: (id, lang) => {
    const pl = PAYLINKS.find((p) => p.id === id)
    return pl ? pick(lang, pl.label) : null
  },
}

// Writes the sample into an empty ledger.
export async function loadSample(storage: Storage, lang: Lang): Promise<void> {
  const config: PlatformConfig = {
    paylinks: PAYLINKS.map((p) => ({ id: p.id, label: pick(lang, p.label), siteUrl: p.site, addedAt: '2026-08-01T02:00:00Z' })),
    maxDepositAddresses: [{ chain: 'solana', token: 'USDC', address: MAX_ADDRESS, addedAt: '2026-08-01T02:10:00Z' }],
  }
  await storage.set('config', config)
  // A random Secret nobody knows: the sample shows notifications as set up, but no real one can get in.
  await saveWebhookSecret(storage, randomBytes(24).toString('base64url'), WEBHOOK_SAVED_AT)
  for (const [n, at, id, notified] of PAYMENTS) {
    if (!notified) continue
    const pl = PAYLINKS.find((p) => p.id === id)!
    const gross = units(pl.price)
    const event: StoredWebhookEvent = {
      transactionSignature: `sample-pay-${n}`,
      helioTransactionId: `sample-${n}`,
      paylinkId: id,
      chainSymbol: 'SOL',
      tokenSymbol: 'USDC',
      amountUnits: gross.toString(),
      feeUnits: ((gross * 2n) / 100n).toString(),
      recipient: pl.wallet,
      createdAt: at,
      receivedAt: at,
    }
    await saveWebhookEvent(storage, event)
  }
  await seedMaxRecords(storage, 'funds_history_sample.csv', MAX_RECORDS)
  await storage.set(SAMPLE_KEY, { loadedAt: new Date().toISOString() })
}
