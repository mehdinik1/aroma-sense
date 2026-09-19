import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Read-only star rating; fractional values fill partially (e.g. 4.6). */
export function Stars({ value, size = 16, className }: { value: number; size?: number; className?: string }) {
  const pct = (Math.max(0, Math.min(5, value)) / 5) * 100
  const row = (cls: string) => (
    <span className="flex w-max">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} style={{ width: size, height: size }} className={cls} aria-hidden="true" />
      ))}
    </span>
  )
  return (
    <span className={cn('relative inline-flex', className)} role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {row('text-border')}
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%` }}>
        {row('fill-primary text-primary')}
      </span>
    </span>
  )
}

/** Accessible 1-5 star picker. */
export function StarInput({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          className="rounded p-0.5 transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Star className={cn('h-7 w-7', n <= value ? 'fill-primary text-primary' : 'text-border')} />
        </button>
      ))}
    </div>
  )
}
