import { Star } from 'lucide-react'
import { PageHero } from '@/components/site/PageHero'
import { Container } from '@/components/site/Container'
import { Reveal } from '@/components/site/Reveal'
import { testimonials, press } from '@/data/buzz'
import { spaPartners } from '@/data/site'
import { lifestyle } from '@/data/lifestyle'

export function TheBuzz() {
  return (
    <>
      <PageHero
        eyebrow="The Buzz"
        title="What people are saying"
        description="From resort spa directors to first-time buyers — here's the reaction to showering with vitamin C aromatherapy."
        image={lifestyle.robeMan}
      />
      <Container className="py-12">
        <div className="mb-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 rounded-2xl border border-border bg-secondary/40 p-6 text-center">
          <span className="w-full text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Used by the spas at
          </span>
          {spaPartners.map((n) => (
            <span key={n} className="font-display text-lg text-muted-foreground">
              {n}
            </span>
          ))}
        </div>

        <h2 className="text-2xl font-semibold">Testimonials</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 60}>
              <figure className="h-full rounded-2xl border border-border bg-card p-6">
                <div className="flex gap-0.5 text-accent">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-4 text-sm font-semibold">
                  {t.name}
                  <span className="block text-xs font-normal text-muted-foreground">{t.role}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>

        <h2 className="mt-16 text-2xl font-semibold">Press</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {press.map((p) => (
            <div key={p.title} className="rounded-2xl border border-border bg-card p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{p.outlet}</p>
              <h3 className="mt-2 text-base font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </>
  )
}
