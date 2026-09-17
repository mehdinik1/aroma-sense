import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from './api'
import { useAccount } from './account'

type WishlistState = {
  handles: Set<string>
  loading: boolean
  has: (handle: string) => boolean
  add: (handle: string) => Promise<void>
  remove: (handle: string) => Promise<void>
  toggle: (handle: string) => Promise<void>
}

const WishlistContext = createContext<WishlistState | null>(null)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { customer } = useAccount()
  const [handles, setHandles] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!customer) {
      setHandles(new Set())
      return
    }
    setLoading(true)
    api.account
      .wishlist()
      .then((r) => setHandles(new Set(r.handles)))
      .catch(() => setHandles(new Set()))
      .finally(() => setLoading(false))
  }, [customer])

  const add = useCallback(async (handle: string) => {
    const r = await api.account.addWishlist(handle)
    setHandles(new Set(r.handles))
  }, [])

  const remove = useCallback(async (handle: string) => {
    const r = await api.account.removeWishlist(handle)
    setHandles(new Set(r.handles))
  }, [])

  const value = useMemo<WishlistState>(() => {
    const has = (handle: string) => handles.has(handle)
    return {
      handles,
      loading,
      has,
      add,
      remove,
      toggle: async (handle: string) => (has(handle) ? remove(handle) : add(handle)),
    }
  }, [handles, loading, add, remove])

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider')
  return ctx
}
