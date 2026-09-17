import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary',
        className,
      )}
    >
      <span className="h-px w-6 bg-primary/60" />
      {children}
    </span>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
}: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  align?: 'left' | 'center'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="font-display text-3xl font-medium sm:text-4xl">{title}</h2>
      {description && (
        <p
          className={cn(
            'max-w-2xl text-base text-muted-foreground sm:text-lg',
            align === 'center' && 'mx-auto',
          )}
        >
          {description}
        </p>
      )}
    </div>
  )
}
