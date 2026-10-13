import type { PlatformStatus } from '../types/platform'
import { getJson } from './http'

// Always real: reads the Pay Link you configured, MoonPay's public data, and your site.
export async function getPlatformStatus(): Promise<PlatformStatus> {
  return getJson<PlatformStatus>('/api/platform/status')
}
