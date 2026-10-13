// Local data that is not configuration: the webhook token, received webhook events and caches.
// All of it lives in dashboard/data/ (gitignored), written owner-read/write only.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const DIR = 'data'

async function readJson<T>(root: string, name: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path.join(root, DIR, name), 'utf8')) as T
  } catch {
    return fallback
  }
}

async function writeJson(root: string, name: string, value: unknown): Promise<void> {
  await mkdir(path.join(root, DIR), { recursive: true, mode: 0o700 })
  await writeFile(path.join(root, DIR, name), `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
}

// ---------- webhook token ----------
// The sharedToken only proves a notification came from MoonPay. It cannot move money
// or change the MoonPay account, but it is still never sent back to the browser.

type WebhookSecret = { sharedToken: string; savedAt: string }

export const loadWebhookSecret = (root: string) => readJson<WebhookSecret | null>(root, 'webhook.local.json', null)
export const saveWebhookSecret = (root: string, sharedToken: string) =>
  writeJson(root, 'webhook.local.json', { sharedToken, savedAt: new Date().toISOString() } satisfies WebhookSecret)
export const clearWebhookSecret = (root: string) => writeJson(root, 'webhook.local.json', null)

// ---------- webhook events ----------
// Only the fields the ledger needs. Buyer details (email, name, address, phone) are dropped on receipt.

export type StoredWebhookEvent = {
  transactionSignature: string
  helioTransactionId: string | null
  paylinkId: string | null
  chainSymbol: string | null
  tokenSymbol: string | null
  amountUnits: string | null
  feeUnits: string | null
  recipient: string | null
  createdAt: string | null
  receivedAt: string
}

export const loadWebhookEvents = (root: string) => readJson<StoredWebhookEvent[]>(root, 'webhook-events.json', [])

export async function upsertWebhookEvent(root: string, event: StoredWebhookEvent): Promise<void> {
  const events = await loadWebhookEvents(root)
  await writeJson(root, 'webhook-events.json', [...events.filter((e) => e.transactionSignature !== event.transactionSignature), event])
}

// ---------- caches (public data, safe to delete) ----------

export const loadCache = <T>(root: string, name: string, fallback: T) => readJson<T>(root, `${name}.cache.json`, fallback)
export const saveCache = (root: string, name: string, value: unknown) => writeJson(root, `${name}.cache.json`, value)
