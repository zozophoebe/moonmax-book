// Session cookies for the deployed site (owner signs in with Google — see server/google.ts).
// HMAC-signed with MOONMAX_SESSION_SECRET and bound to the current owner record, so resetting
// the owner signs every old session out.

import { createHmac, timingSafeEqual } from 'node:crypto'

const COOKIE = 'mm_session'
const MAX_AGE_S = 30 * 24 * 3600

const mac = (secret: string, exp: number, binding: string) => createHmac('sha256', secret).update(`moonmax-session:${exp}:${binding}`).digest('hex')

export function verifySession(cookieHeader: string | null, secret: string, binding: string): boolean {
  const raw = (cookieHeader ?? '')
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1)
  const [expStr, sig] = (raw ?? '').split('.')
  const exp = Number(expStr)
  if (!sig || !Number.isFinite(exp) || exp * 1000 < Date.now()) return false
  const a = Buffer.from(sig)
  const b = Buffer.from(mac(secret, exp, binding))
  return a.length === b.length && timingSafeEqual(a, b)
}

export function sessionCookie(secret: string, binding: string, secure: boolean): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_S
  return `${COOKIE}=${exp}.${mac(secret, exp, binding)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE_S}${secure ? '; Secure' : ''}`
}

export const clearedCookie = (secure: boolean) => `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`
