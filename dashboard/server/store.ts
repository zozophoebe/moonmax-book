// Data that is not configuration: the webhook Secret, received webhook events and caches.
// Locally under dashboard/data/ (gitignored, owner-only); on Vercel in the private Blob store.

import { OWNER_KEY } from './google'
import type { Storage } from './storage'

// ---------- webhook Secret ----------
// MoonPay's dashboard calls it the endpoint "Secret"; its docs call it sharedToken. It only
// proves a notification came from MoonPay — it cannot move money or change the account —
// but it is still never sent back to the browser.

type WebhookSecret = { sharedToken: string; savedAt: string }

const SECRET_KEY = 'webhook.local'

export const loadWebhookSecret = (storage: Storage) => storage.get<WebhookSecret>(SECRET_KEY)
export const saveWebhookSecret = (storage: Storage, sharedToken: string) =>
  storage.set(SECRET_KEY, { sharedToken, savedAt: new Date().toISOString() } satisfies WebhookSecret)
export const clearWebhookSecret = (storage: Storage) => storage.del([SECRET_KEY])

// ---------- webhook events ----------
// One record per payment, keyed by its transaction signature, so concurrent deliveries
// can't overwrite each other. Buyer details (email, name, address, phone) are dropped on receipt.

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

const eventKey = (signature: string) => `events/${signature.replace(/[^A-Za-z0-9_-]/g, '_')}`

export async function loadWebhookEvents(storage: Storage): Promise<StoredWebhookEvent[]> {
  const keys = await storage.list('events/')
  const events = await Promise.all(keys.map((k) => storage.get<StoredWebhookEvent>(k)))
  return events.filter((e): e is StoredWebhookEvent => e !== null)
}

export const saveWebhookEvent = (storage: Storage, event: StoredWebhookEvent) => storage.set(eventKey(event.transactionSignature), event)

// "Sign out and start over": settings, Secret, received events and the Google owner.
// ('auth.local' is a leftover from the earlier password login.) Public caches stay.
export async function resetAll(storage: Storage): Promise<void> {
  await storage.del(['config', SECRET_KEY, OWNER_KEY, 'auth.local', ...(await storage.list('events/'))])
}

// ---------- caches (public data, safe to delete) ----------

export const loadCache = async <T>(storage: Storage, name: string, fallback: T) => (await storage.get<T>(`${name}.cache`)) ?? fallback
export const saveCache = (storage: Storage, name: string, value: unknown) => storage.set(`${name}.cache`, value)
