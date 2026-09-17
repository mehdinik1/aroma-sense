import { useCallback, useEffect, useRef } from 'react'

/** Returns a stable function identity that always calls the latest `fn`. */
export function useCallbackRef<T extends (...args: never[]) => unknown>(fn: T): T {
  const ref = useRef(fn)
  useEffect(() => {
    ref.current = fn
  })
  return useCallback((...args: Parameters<T>) => ref.current(...args), []) as unknown as T
}
