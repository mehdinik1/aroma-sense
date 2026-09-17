import { Award, Lock, Truck, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Backed by the real store policies (server/data/pages.json: shipping-policy,
// returns-policy, warranty) — no invented guarantees.
const badges = [
  { icon: Truck, label: 'Free US shipping', sub: '3–6 business days' },
  { icon: Undo2, label: '30-day returns', sub: 'Unused, original packaging' },
  { icon: Award, label: '1-year warranty', sub: 'Manufacturing defects' },
  { icon: Lock, label: 'Secure checkout', sub: 'Stripe · Apple & Google Pay' },
]

export function TrustBadges({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn('grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4', className)}>
      {badges.map((b) => (
        <div key={b.label} className="flex items-start gap-2.5">
          <b.icon className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.4} />
          <div>
            <p className="text-xs font-semibold leading-tight text-foreground">{b.label}</p>
            {!compact && <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{b.sub}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
