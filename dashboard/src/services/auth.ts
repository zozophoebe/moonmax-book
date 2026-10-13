import type { SetupState } from '../types/setup'
import { getJson, sendJson } from './http'

export type AuthState = {
  // none: local dev, no login · google: the deployed site, owner signs in with Google
  method: 'none' | 'google'
  configured: boolean // deployed without Google keys = closed
  authenticated: boolean
  ownerEmail: string | null
}

export const GOOGLE_START = '/api/auth/google/start'

export const getAuth = () => getJson<AuthState>('/api/auth/me')
export const logout = () => sendJson<{ ok: true }>('/api/auth/logout', 'POST', {})
// Clears Pay Links, the webhook Secret, the MAX address, received notifications and the Google owner.
export const resetEverything = () => sendJson<SetupState>('/api/setup/reset', 'POST', {})
