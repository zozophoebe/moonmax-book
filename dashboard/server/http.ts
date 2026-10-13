export async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 10_000) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(ms), headers: { 'user-agent': 'moonmax-book-dev/0.1', ...init.headers } })
}
