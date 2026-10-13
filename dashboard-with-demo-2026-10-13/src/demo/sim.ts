// Mock transport for the demo page only (/demo/). Nothing outside services/ and demo/ imports this.

import { ApiError } from '../services/http'

export type Scenario = 'normal' | 'empty' | 'loading' | 'error'

const SCENARIOS: Scenario[] = ['normal', 'empty', 'loading', 'error']

export function currentScenario(): Scenario {
  const raw = new URLSearchParams(window.location.search).get('scenario')
  return SCENARIOS.find((s) => s === raw) ?? 'normal'
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export async function simulate<T>(opts: { source: string; failsOnError: boolean }, produce: (scenario: Scenario) => T): Promise<T> {
  const scenario = currentScenario()
  if (scenario === 'loading') await wait(10 * 60 * 1000)
  await wait(320 + Math.random() * 480)
  if (scenario === 'error' && opts.failsOnError) throw new ApiError(opts.source, '連線逾時，伺服器沒有回應。')
  return produce(scenario)
}
