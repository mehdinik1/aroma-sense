import { useSyncExternalStore } from 'react'

export type Decision = 'granted' | 'denied' | 'unset'

declare global {
  interface Window {
    __analytics?: {
      required: boolean
      loaded: boolean
      decision: () => Decision
      load: () => void
      set: (choice: 'granted' | 'denied') => void
    }
  }
}

const OPEN_EVENT = 'aroma-consent-open'

const read = (): Decision => window.__analytics?.decision() ?? 'denied'
const subscribe = (cb: () => void) => {
  window.addEventListener('aroma-consent', cb)
  return () => window.removeEventListener('aroma-consent', cb)
}

/** Current analytics decision; re-renders when the visitor changes it. */
export function useConsent() {
  return useSyncExternalStore(subscribe, read, () => 'denied' as Decision)
}

export const setConsent = (choice: 'granted' | 'denied') => window.__analytics?.set(choice)
export const openConsentSettings = () => window.dispatchEvent(new Event(OPEN_EVENT))
export const onOpenConsentSettings = (cb: () => void) => {
  window.addEventListener(OPEN_EVENT, cb)
  return () => window.removeEventListener(OPEN_EVENT, cb)
}
export const globalPrivacyControlOn = () => typeof navigator !== 'undefined' && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
