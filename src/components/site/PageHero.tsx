import type { ReactNode } from 'react'
import { Container } from './Container'

export function PageHero({
  eyebrow,
  title,
  description,
  image,
  children,
}: {
  eyebrow?: string
  title: string
  description?: ReactNode
  image?: string
  children?: ReactNode
}) {
  return (
    <div className="relative isolate overflow-hidden border-b border-primary/15">
      {image ? (
        <>
          <img src={image} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/85 to-background/40" />
        </>
      ) : (
        <div className="bg-vignette absolute inset-0 -z-10" />
      )}
      <Container className={image ? 'py-24 sm:py-32' : 'py-16 sm:py-20'}>
        {eyebrow && (
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-4xl font-medium sm:text-5xl">{title}</h1>
        {description && (
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {description}
          </p>
        )}
        {children}
      </Container>
    </div>
  )
}

export function Loading() {
  return (
    <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
      Loading…
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
      {message}
    </div>
  )
}
