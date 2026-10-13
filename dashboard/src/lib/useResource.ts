import { useCallback, useEffect, useState } from 'react'

export type Resource<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; error: Error }

// Containers only. Presentational components receive resolved data as props.
export function useResource<T>(load: () => Promise<T>, deps: readonly unknown[]): [Resource<T>, () => void] {
  const [state, setState] = useState<Resource<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const reload = useCallback(() => setAttempt((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    load().then(
      (data) => !cancelled && setState({ status: 'ready', data }),
      (error: unknown) =>
        !cancelled && setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) }),
    )
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt])

  return [state, reload]
}
