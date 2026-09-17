import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type A11ySettings = {
  textScale: 1 | 1.15 | 1.3
  contrast: 'normal' | 'high'
  motion: 'normal' | 'reduced'
  links: 'default' | 'underline'
  font: 'default' | 'readable'
  focus: 'default' | 'enhanced'
}

const DEFAULTS: A11ySettings = {
  textScale: 1,
  contrast: 'normal',
  motion: 'normal',
  links: 'default',
  font: 'default',
  focus: 'default',
}

const KEY = 'aroma-sense-a11y-v1'

function load(): A11ySettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return DEFAULTS
}

function apply(s: A11ySettings) {
  const el = document.documentElement
  el.dataset.a11yContrast = s.contrast
  el.dataset.a11yMotion = s.motion
  el.dataset.a11yLinks = s.links
  el.dataset.a11yFont = s.font
  el.dataset.a11yFocus = s.focus
  el.style.setProperty('--a11y-text-scale', String(s.textScale))
}

function save(s: A11ySettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

type A11yContextValue = {
  settings: A11ySettings
  set: <K extends keyof A11ySettings>(key: K, value: A11ySettings[K]) => void
  reset: () => void
  isDefault: boolean
}

const A11yContext = createContext<A11yContextValue | null>(null)

export function A11yProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<A11ySettings>(DEFAULTS)

  useEffect(() => {
    const loaded = load()
    setSettings(loaded)
    apply(loaded)
  }, [])

  const set = useCallback<A11yContextValue['set']>((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      apply(next)
      save(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setSettings(DEFAULTS)
    apply(DEFAULTS)
    save(DEFAULTS)
  }, [])

  const value = useMemo<A11yContextValue>(
    () => ({
      settings,
      set,
      reset,
      isDefault: (Object.keys(DEFAULTS) as (keyof A11ySettings)[]).every(
        (k) => settings[k] === DEFAULTS[k],
      ),
    }),
    [settings, set, reset],
  )

  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>
}

export function useA11y() {
  const ctx = useContext(A11yContext)
  if (!ctx) throw new Error('useA11y must be used within A11yProvider')
  return ctx
}
