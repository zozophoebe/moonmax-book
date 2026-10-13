// Who is signed in, and where their data lives. Every Google account gets its own ledger,
// stored under u/<uid>/. The owner of the earlier single-owner version ('owner.local') keeps
// the root of the store, so their settings and their webhook URL (/api/hook/moonpay) keep working.

import { createHash, randomBytes } from 'node:crypto'
import { loadOwner, OWNER_KEY } from './google'
import { HOOK_PATH } from './ledger'
import type { Storage } from './storage'

export type Account = { uid: string; sub: string; email: string; createdAt: string }

const LEGACY_UID = 'owner'
const UID = /^[a-f0-9]{32}$/

// Google's account id is not secret, but there's no reason to spell it out in storage paths.
const loginKey = (sub: string) => `logins/${createHash('sha256').update(`moonmax:${sub}`).digest('hex').slice(0, 40)}`
const accountKey = (uid: string) => `accounts/${uid}`

export async function accountForLogin(storage: Storage, who: { sub: string; email: string }): Promise<Account> {
  const owner = await loadOwner(storage)
  if (owner?.sub === who.sub) return { uid: LEGACY_UID, sub: owner.sub, email: who.email, createdAt: owner.claimedAt }
  const link = await storage.get<{ uid: string }>(loginKey(who.sub))
  const existing = link && UID.test(link.uid) ? await storage.get<Account>(accountKey(link.uid)) : null
  if (existing && existing.sub === who.sub) {
    if (existing.email !== who.email) await storage.set(accountKey(existing.uid), { ...existing, email: who.email })
    return { ...existing, email: who.email }
  }
  const account: Account = { uid: randomBytes(16).toString('hex'), sub: who.sub, email: who.email, createdAt: new Date().toISOString() }
  await storage.set(accountKey(account.uid), account)
  await storage.set(loginKey(who.sub), { uid: account.uid })
  return account
}

export async function accountByUid(storage: Storage, uid: string): Promise<Account | null> {
  if (uid === LEGACY_UID) {
    const owner = await loadOwner(storage)
    return owner ? { uid, sub: owner.sub, email: owner.email, createdAt: owner.claimedAt } : null
  }
  return UID.test(uid) ? storage.get<Account>(accountKey(uid)) : null
}

// "Delete account and all data": the ledger is emptied separately (clearWorkspace); this removes
// the account itself, so signing in again starts a brand-new one.
export async function deleteAccount(storage: Storage, account: Account): Promise<void> {
  if (account.uid === LEGACY_UID) return storage.del([OWNER_KEY])
  await storage.del([accountKey(account.uid), loginKey(account.sub)])
}

export const workspacePrefix = (uid: string) => (uid === LEGACY_UID ? '' : `u/${uid}/`)
export const hookPathFor = (uid: string) => (uid === LEGACY_UID ? HOOK_PATH : `${HOOK_PATH}/${uid}`)
// Sessions are signed against this, so a new account record (same uid can't recur) can't reuse old cookies.
export const sessionBinding = (a: Account) => `google:${a.uid}:${a.sub}:${a.createdAt}`
