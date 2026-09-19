import { BadgeCheck } from 'lucide-react'
import { Stars } from './Stars'
import { formatDate } from '@/lib/utils'
import type { ProductReviews } from '@/lib/types'

/** Only rendered when real, approved reviews exist. */
export function ReviewsSection({ data }: { data: ProductReviews }) {
  if (!data.summary.count) return null
  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="mt-16 scroll-mt-28">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <h2 id="reviews-heading" className="text-xl font-semibold">
          Customer reviews
        </h2>
        <div className="flex items-center gap-2">
          <Stars value={data.summary.average} size={18} />
          <span className="text-sm text-muted-foreground">
            <strong className="text-foreground">{data.summary.average.toFixed(1)}</strong> out of 5 · {data.summary.count} review
            {data.summary.count === 1 ? '' : 's'}
          </span>
        </div>
      </div>
      <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
        {data.reviews.map((r) => (
          <li key={r.id} className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Stars value={r.rating} size={15} />
              {r.title && <h3 className="text-sm font-semibold">{r.title}</h3>}
            </div>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{r.body}</p>
            <p className="mt-3 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{r.name}</span>
              <span className="inline-flex items-center gap-1 text-primary">
                <BadgeCheck className="h-3.5 w-3.5" /> Verified purchase
              </span>
              <span>· {formatDate(r.createdAt.replace(' ', 'T') + 'Z')}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
