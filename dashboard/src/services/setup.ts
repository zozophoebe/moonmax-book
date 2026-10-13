import type { SetupState } from '../types/setup'
import { getJson, sendJson } from './http'

export const getSetup = () => getJson<SetupState>('/api/setup')
export const addPaylink = (input: string, label: string) => sendJson<SetupState>('/api/setup/paylinks', 'POST', { input, label })
export const updatePaylink = (id: string, patch: { label?: string | null; siteUrl?: string | null }) =>
  sendJson<SetupState>('/api/setup/paylinks', 'PATCH', { id, ...patch })
export const removePaylink = (id: string) => sendJson<SetupState>(`/api/setup/paylinks?id=${encodeURIComponent(id)}`, 'DELETE')
export const saveWebhookToken = (sharedToken: string) => sendJson<SetupState>('/api/setup/webhook', 'POST', { sharedToken })
export const clearWebhookToken = () => sendJson<SetupState>('/api/setup/webhook', 'DELETE')
export const saveMaxAddress = (address: string) => sendJson<SetupState>('/api/setup/max-address', 'POST', { address })
export const clearMaxAddress = () => sendJson<SetupState>('/api/setup/max-address', 'DELETE')
// A made-up ledger to look around with (empty ledgers only); read-only until cleared.
export const loadSampleData = () => sendJson<SetupState>('/api/sample', 'POST', {})
export const clearSampleData = () => sendJson<SetupState>('/api/sample', 'DELETE')
