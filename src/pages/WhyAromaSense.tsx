import { Link } from 'react-router-dom'
import { PageHero } from '@/components/site/PageHero'
import { Container, Section } from '@/components/site/Container'
import { Reveal } from '@/components/site/Reveal'
import { benefits, spaPartners } from '@/data/site'
import { lifestyle } from '@/data/lifestyle'

export function WhyAromaSense() {
  return (
    <>
      <PageHero
        eyebrow="Why Aroma Sense"
        title="A spa-grade shower, backed by hotels that do this for a living"
        description="Aroma Sense makes the vitamin C aromatherapy shower systems used in luxury hotel spas — the same technology, for your bathroom at home."
        image={lifestyle.bathroom}
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <Reveal>
            <div className="grid gap-6 sm:grid-cols-2">
              {benefits.map((b) => (
                <div key={b.title} className="border-t border-primary/25 pt-5">
                  <h2 className="font-display text-lg text-foreground">{b.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.body}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="aspect-[4/5] overflow-hidden rounded-lg border border-primary/20">
              <img src={lifestyle.robe} alt="" className="h-full w-full object-cover" />
            </div>
          </Reveal>
        </div>
      </Section>

      <div className="border-y border-primary/15 bg-card">
        <Container className="py-12 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
            Trusted by the spas at
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-3">
            {spaPartners.map((n) => (
              <span key={n} className="font-display text-xl italic text-muted-foreground">
                {n}
              </span>
            ))}
          </div>
        </Container>
      </div>

      <Section className="text-center">
        <Link
          to="/collections/shower-heads"
          className="inline-flex h-12 items-center rounded-full bg-primary px-8 text-[13px] font-semibold uppercase tracking-[0.08em] text-primary-foreground transition hover:bg-accent"
        >
          Shop shower heads
        </Link>
      </Section>
    </>
  )
}
