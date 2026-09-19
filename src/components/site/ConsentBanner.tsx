import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { globalPrivacyControlOn, onOpenConsentSettings, setConsent, useConsent } from '@/lib/consent'

/**
 * First-visit banner where the law requires opt-in (EU/EEA/UK/Switzerland), plus a settings panel
 * anyone can open from the footer. "Accept" and "Reject" are deliberately equal in weight.
 */
export function ConsentBanner() {
  const decision = useConsent()
  const [manage, setManage] = useState(false)
  useEffect(() => onOpenConsentSettings(() => setManage(true)), [])

  const asking = decision === 'unset'
  if (!asking && !manage) return null

  const choose = (choice: 'granted' | 'denied') => {
    setConsent(choice)
    setManage(false)
  }

  return (
    <div
      role="dialog"
      aria-labelledby="consent-title"
      className="fixed inset-x-3 bottom-3 z-[60] rounded-2xl border border-primary/30 bg-card p-5 shadow-2xl shadow-black/50 sm:left-auto sm:right-4 sm:max-w-sm"
    >
      {manage && !asking && (
        <button aria-label="Close" onClick={() => setManage(false)} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      )}
      <h2 id="consent-title" className="font-display text-lg text-foreground">
        {asking ? 'Cookies & privacy' : 'Cookie settings'}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        We use Google Analytics cookies to see which pages and products people use, so we can improve the store. They stay off unless you
        allow them. Essential storage for your cart and sign-in is always on.{' '}
        <Link to="/pages/privacy-policy" onClick={() => setManage(false)} className="font-semibold text-primary hover:underline">
          Privacy policy
        </Link>
      </p>
      {!asking && (
        <p className="mt-2 text-xs text-muted-foreground">
          Analytics is currently <strong className="text-foreground">{decision === 'granted' ? 'on' : 'off'}</strong>.
          {globalPrivacyControlOn() && ' Your browser’s Global Privacy Control signal is honored.'}
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => choose('denied')}>
          {asking ? 'Reject' : 'Turn off'}
        </Button>
        <Button onClick={() => choose('granted')}>{asking ? 'Accept' : 'Turn on'}</Button>
      </div>
    </div>
  )
}
