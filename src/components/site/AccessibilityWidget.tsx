import { useEffect, useRef, useState } from 'react'
import { Accessibility, RotateCcw, X } from 'lucide-react'
import { useA11y, type A11ySettings } from '@/lib/a11y'
import { cn } from '@/lib/utils'

type Group<K extends keyof A11ySettings> = {
  key: K
  label: string
  hint?: string
  options: { value: A11ySettings[K]; label: string }[]
}

const groups = [
  {
    key: 'textScale',
    label: 'Text size',
    options: [
      { value: 1, label: 'Default' },
      { value: 1.15, label: 'Large' },
      { value: 1.3, label: 'Larger' },
    ],
  } as Group<'textScale'>,
  {
    key: 'contrast',
    label: 'Contrast',
    options: [
      { value: 'normal', label: 'Normal' },
      { value: 'high', label: 'High' },
    ],
  } as Group<'contrast'>,
  {
    key: 'motion',
    label: 'Motion',
    hint: 'Turns off animations and auto-scrolling elements.',
    options: [
      { value: 'normal', label: 'Normal' },
      { value: 'reduced', label: 'Reduced' },
    ],
  } as Group<'motion'>,
  {
    key: 'links',
    label: 'Links',
    options: [
      { value: 'default', label: 'Default' },
      { value: 'underline', label: 'Underlined' },
    ],
  } as Group<'links'>,
  {
    key: 'font',
    label: 'Font',
    hint: 'Uses a plain sans-serif with extra spacing for easier reading.',
    options: [
      { value: 'default', label: 'Default' },
      { value: 'readable', label: 'Readable' },
    ],
  } as Group<'font'>,
  {
    key: 'focus',
    label: 'Focus outline',
    options: [
      { value: 'default', label: 'Default' },
      { value: 'enhanced', label: 'Enhanced' },
    ],
  } as Group<'focus'>,
]

export function AccessibilityWidget() {
  const { settings, set, reset, isDefault } = useA11y()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        btnRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    panelRef.current?.querySelector<HTMLElement>('button, [href], input')?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Accessibility settings"
        className="fixed bottom-5 left-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-card text-primary shadow-xl shadow-black/40 transition hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Accessibility className="h-6 w-6" />
        {!isDefault && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card bg-accent" />
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="presentation">
          <div className="absolute inset-0" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Accessibility settings"
            className="absolute bottom-5 left-5 max-h-[80vh] w-[min(22rem,calc(100vw-2.5rem))] overflow-y-auto rounded-xl border border-primary/25 bg-card p-5 shadow-2xl shadow-black/60"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg text-foreground">Accessibility</h2>
              <button
                onClick={() => {
                  setOpen(false)
                  btnRef.current?.focus()
                }}
                aria-label="Close"
                className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {groups.map((g) => (
                <fieldset key={g.key}>
                  <legend className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    {g.label}
                  </legend>
                  <div className="flex gap-1.5">
                    {g.options.map((opt) => {
                      const selected = settings[g.key] === opt.value
                      return (
                        <button
                          key={String(opt.value)}
                          onClick={() => set(g.key, opt.value)}
                          aria-pressed={selected}
                          className={cn(
                            'flex-1 rounded-md border px-2.5 py-2 text-xs font-medium transition',
                            selected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border text-foreground/80 hover:border-primary/50',
                          )}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                  {g.hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{g.hint}</p>}
                </fieldset>
              ))}
            </div>

            <button
              onClick={reset}
              disabled={isDefault}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-md border border-border py-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground transition hover:text-foreground disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset to default
            </button>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Your choices are saved on this device. The site also follows your browser and
              operating-system accessibility settings.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
