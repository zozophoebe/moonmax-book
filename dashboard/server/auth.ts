// Session cookies for the deployed site (everyone signs in with Google — see server/google.ts).
// The cookie names the account (uid) and is HMAC-signed with MOONMAX_SESSION_SECRET over that
// account's record, so a cookie can't be moved to another account or outlive its record.

import { createHmac, timingSafeEqual } from 'node:crypto'

const COOKIE = 'mm_session'
const MAX_AGE_S = 30 * 24 * 3600

export type Session = { exp: number; uid: string; sig: string }

const mac = (secret: string, exp: number, uid: string, binding: string) => createHmac('sha256', secret).update(`moonmax-session:v2:${exp}:${uid}:${binding}`).digest('hex')

export function readSession(cookieHeader: string | null): Session | null {
  const raw = (cookieHeader ?? '')
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1)
  const [expStr, uid, sig] = (raw ?? '').split('.')
  const exp = Number(expStr)
  if (!uid || !sig || !Number.isFinite(exp) || exp * 1000 < Date.now()) return null
  return { exp, uid, sig }
}

export function verifySession(s: Session, secret: string, binding: string): boolean {
  const a = Buffer.from(s.sig)
  const b = Buffer.from(mac(secret, s.exp, s.uid, binding))
  return a.length === b.length && timingSafeEqual(a, b)
}

export function sessionCookie(secret: string, uid: string, binding: string, secure: boolean): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_S
  return `${COOKIE}=${exp}.${uid}.${mac(secret, exp, uid, binding)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE_S}${secure ? '; Secure' : ''}`
}

export const clearedCookie = (secure: boolean) => `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`
