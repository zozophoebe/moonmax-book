// "Sign in with Google" for the deployed site (OpenID Connect, authorization-code flow).
// Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. The first Google account to sign in becomes
// the owner (stored as 'owner.local'); every later sign-in must be that same account.
// Keeping the Google app in "Testing" with only the owner as a test user adds a second lock.

import { randomBytes } from 'node:crypto'
import { fetchWithTimeout } from './http'
import type { Storage } from './storage'

export type GoogleConfig = { clientId: string; clientSecret: string }
export type Owner = { sub: string; email: string; claimedAt: string }

export const OWNER_KEY = 'owner.local'
export const loadOwner = (storage: Storage) => storage.get<Owner>(OWNER_KEY)
export const saveOwner = (storage: Storage, owner: Owner) => storage.set(OWNER_KEY, owner)
// Sessions are bound to the owner record: resetting it signs everyone out.
export const ownerBinding = (o: Owner) => `google:${o.sub}:${o.claimedAt}`

const OAUTH_COOKIE = 'mm_oauth'
const ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com'])

export function newOauthState(): { state: string; nonce: string } {
  return { state: randomBytes(24).toString('base64url'), nonce: randomBytes(24).toString('base64url') }
}

// Lax, not Strict: the callback is a top-level navigation coming back from accounts.google.com.
export const oauthCookie = (state: string, nonce: string, secure: boolean) =>
  `${OAUTH_COOKIE}=${state}.${nonce}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=600${secure ? '; Secure' : ''}`
export const clearedOauthCookie = (secure: boolean) => `${OAUTH_COOKIE}=; Path=/api; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`

export function readOauthCookie(cookieHeader: string | null): { state: string; nonce: string } | null {
  const raw = (cookieHeader ?? '')
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${OAUTH_COOKIE}=`))
    ?.slice(OAUTH_COOKIE.length + 1)
  const [state, nonce] = (raw ?? '').split('.')
  return state && nonce ? { state, nonce } : null
}

export function authorizeUrl(cfg: GoogleConfig, redirectUri: string, state: string, nonce: string): string {
  const q = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email',
    state,
    nonce,
    prompt: 'select_account',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`
}

export class GoogleLoginError extends Error {
  constructor(readonly code: 'exchange' | 'token' | 'unverified' | 'nonce') {
    super(code)
  }
}

// The ID token comes straight from Google's token endpoint over TLS, authenticated with our
// client secret, so its claims can be checked without verifying the JWT signature (OIDC Core 3.1.3.7).
export async function exchangeCode(cfg: GoogleConfig, code: string, redirectUri: string, nonce: string): Promise<{ sub: string; email: string }> {
  const res = await fetchWithTimeout('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: cfg.clientId, client_secret: cfg.clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }).toString(),
  })
  if (!res.ok) throw new GoogleLoginError('exchange')
  const { id_token: idToken } = (await res.json()) as { id_token?: string }
  const payload = idToken?.split('.')[1]
  if (!payload) throw new GoogleLoginError('token')
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
    iss?: string
    aud?: string
    exp?: number
    sub?: string
    email?: string
    email_verified?: boolean
    nonce?: string
  }
  if (!claims.iss || !ISSUERS.has(claims.iss) || claims.aud !== cfg.clientId || !claims.exp || claims.exp * 1000 < Date.now() || !claims.sub) {
    throw new GoogleLoginError('token')
  }
  if (claims.nonce !== nonce) throw new GoogleLoginError('nonce')
  if (!claims.email || claims.email_verified !== true) throw new GoogleLoginError('unverified')
  return { sub: claims.sub, email: claims.email }
}
