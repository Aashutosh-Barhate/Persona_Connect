import { useCallback, useEffect, useState } from 'react'

interface AsyncState<T> {
  data: T | null
  error: Error | null
  loading: boolean
}

/**
 * Minimal async hook with retry. Wraps a promise factory and re-runs it when
 * `retry()` is called (e.g. after a failed request).
 */
export function useAsync<T>(factory: () => Promise<T>, deps: unknown[]): AsyncState<T> & { retry: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: true })
  const [nonce, setNonce] = useState(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(factory, deps)

  useEffect(() => {
    let alive = true
    setState((prev) => ({ ...prev, loading: true, error: null }))
    run()
      .then((data) => {
        if (alive) setState({ data, error: null, loading: false })
      })
      .catch((error: unknown) => {
        if (alive) {
          setState({
            data: null,
            error: error instanceof Error ? error : new Error('Unexpected error'),
            loading: false,
          })
        }
      })
    return () => {
      alive = false
    }
  }, [run, nonce])

  const retry = useCallback(() => setNonce((value) => value + 1), [])
  return { ...state, retry }
}
