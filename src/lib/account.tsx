import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from './api'
import type { Customer, RewardsInfo } from './types'

type AccountState = {
  customer: Customer | null
  rewards: RewardsInfo | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  updateProfile: (body: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) => Promise<void>
}

const AccountContext = createContext<AccountState | null>(null)

export function AccountProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [rewards, setRewards] = useState<RewardsInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const { customer, rewards } = await api.account.me()
      setCustomer(customer)
      setRewards(rewards)
    } catch {
      // not signed in (401) or transient — treat as logged out
      setCustomer(null)
      setRewards(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(
    async (email: string, password: string) => {
      await api.account.login(email, password)
      await refresh()
    },
    [refresh],
  )

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      await api.account.register(email, password, name)
      await refresh()
    },
    [refresh],
  )

  const logout = useCallback(async () => {
    await api.account.logout()
    setCustomer(null)
    setRewards(null)
  }, [])

  const updateProfile = useCallback(
    async (body: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) => {
      const { customer } = await api.account.updateProfile(body)
      setCustomer(customer)
    },
    [],
  )

  const value = useMemo<AccountState>(
    () => ({ customer, rewards, loading, login, register, logout, refresh, updateProfile }),
    [customer, rewards, loading, login, register, logout, refresh, updateProfile],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used within AccountProvider')
  return ctx
}
