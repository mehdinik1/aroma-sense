import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Theme = 'dark' | 'light'

const KEY = 'aroma-sense-theme-v1'
const DEFAULT: Theme = 'dark'

function load(): Theme {
  try {
    const raw = localStorage.getItem(KEY)
    return raw === 'light' || raw === 'dark' ? raw : DEFAULT
  } catch {
    return DEFAULT
  }
}

function apply(theme: Theme) {
  // dark has no attribute (it's the :root default) — only light needs the marker
  if (theme === 'light') document.documentElement.dataset.theme = 'light'
  else delete document.documentElement.dataset.theme

  // keep the mobile browser-chrome tint in sync with the actual page background
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f6f1e4' : '#141310')
}

function save(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* ignore */
  }
}

type ThemeState = { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void }

const ThemeContext = createContext<ThemeState | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT)

  useEffect(() => {
    const loaded = load()
    setThemeState(loaded)
    apply(loaded)
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    apply(t)
    save(t)
  }, [])

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      apply(next)
      save(next)
      return next
    })
  }, [])

  const value = useMemo<ThemeState>(() => ({ theme, toggle, setTheme }), [theme, toggle, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
