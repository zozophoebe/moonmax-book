import type { SetupState } from '../types/setup'
import { getJson, sendJson } from './http'

export type AuthState = {
  // none: local dev, no login · google: the deployed site, anyone signs in with Google
  method: 'none' | 'google'
  configured: boolean // deployed without Google keys = closed
  authenticated: boolean
  email: string | null // the signed-in Google account
}

export const GOOGLE_START = '/api/auth/google/start'

export const getAuth = () => getJson<AuthState>('/api/auth/me')
export const logout = () => sendJson<{ ok: true }>('/api/auth/logout', 'POST', {})
// Deployed: deletes this account and its ledger. Local: clears every setting.
export const resetEverything = () => sendJson<SetupState>('/api/setup/reset', 'POST', {})
