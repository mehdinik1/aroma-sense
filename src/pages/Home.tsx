import { Link } from 'react-router-dom'
import { ArrowRight, Droplets, Leaf, Quote, RefreshCw, Sparkles, Star, Wind } from 'lucide-react'
import { Container, Section } from '@/components/site/Container'
import { SectionHeading } from '@/components/site/primitives'
import { Reveal } from '@/components/site/Reveal'
import { ProductCard } from '@/components/shop/ProductCard'
import { TrustBadges } from '@/components/site/TrustBadges'
import { Loading } from '@/components/site/PageHero'
import { useAsync, loadProducts } from '@/lib/store'
import { api } from '@/lib/api'
import { benefits, spaPartners } from '@/data/site'
import { lifestyle, ritual, gallery } from '@/data/lifestyle'
import { testimonials, press } from '@/data/buzz'

const benefitIcons = [Droplets, Leaf, Sparkles, Wind]

export function Home() {
  const products = useAsync(loadProducts, [])
  const articles = useAsync(() => api.blog(), [])

  const featured = (products.data ?? []).filter((p) => p.featured).slice(0, 4)
  const bestsellers = (products.data ?? [])
    .filter((p) => p.productType === 'Starter Kits')
    .slice(0, 4)
  const posts = (articles.data ?? []).slice(0, 3)

  return (
    <>
      {/* Hero — full-bleed spa photography */}
      <section className="relative isolate overflow-hidden border-b border-primary/15">
        <img
          src={lifestyle.bathroom}
          alt=""
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/85 to-background/30" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-transparent to-background/40" />
        <Container className="grid items-center gap-12 py-24 sm:py-32 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <p className="mb-5 inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
              <span className="h-px w-8 bg-primary/60" />
              Vitamin C · Aromatherapy · Filtered water
            </p>
            <h1 className="font-display text-[3rem] font-medium leading-[1.03] text-foreground sm:text-[4.6rem]">
              Turn your shower <br className="hidden sm:block" />
              into a <span className="text-gradient italic">spa</span>
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-relaxed text-foreground/80">
              Vitamin C aromatherapy shower systems trusted by five-star hotel spas — filtered,
              chlorine-free water, real essential-oil scent, and a fuller, softer spray.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/collections/shower-heads"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-8 text-[13px] font-semibold uppercase tracking-[0.08em] text-primary-foreground transition hover:-translate-y-0.5 hover:bg-accent"
              >
                Shop shower heads <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/how-it-works"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-primary/45 bg-background/40 px-8 text-[13px] font-semibold uppercase tracking-[0.08em] text-primary backdrop-blur transition hover:-translate-y-0.5 hover:bg-primary/10"
              >
                How it works
              </Link>
            </div>
            <div className="mt-9 flex items-center gap-6 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-primary text-primary" /> Trusted by luxury hotel spas
              </span>
              <span>Complimentary U.S. shipping</span>
            </div>
          </Reveal>

          <Reveal delay={120} className="relative hidden lg:block">
            <div className="photo-tile relative ml-auto aspect-[4/5] max-w-sm overflow-hidden rounded-lg border border-primary/30 shadow-2xl shadow-black/50">
              <img
                src="/products/as-luxe/0.jpg"
                alt="Aroma Sense Luxe Handheld Vitamin C Shower Head"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-4 -left-4 rounded-md border border-primary/25 bg-card/95 px-4 py-3 shadow-xl backdrop-blur">
              <p className="font-display text-base text-foreground">200+ precision nozzles</p>
              <p className="text-xs text-muted-foreground">1.5× stronger pressure, less water</p>
            </div>
            <div className="absolute -right-3 top-8 flex items-center gap-2 rounded-full border border-primary/25 bg-card/95 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary shadow-xl backdrop-blur">
              <RefreshCw className="h-3.5 w-3.5" /> Subscribe &amp; save 15%
            </div>
          </Reveal>
        </Container>
      </section>

      {/* Trust bar — real policy terms, right where a first-time visitor lands */}
      <div className="border-b border-primary/15 bg-card">
        <Container className="py-6">
          <Reveal>
            <TrustBadges />
          </Reveal>
        </Container>
      </div>

      {/* The difference — image + benefits */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Reveal className="relative">
            <div className="aspect-[4/5] overflow-hidden rounded-lg border border-primary/20">
              <img src={lifestyle.hair} alt="" className="h-full w-full object-cover" />
            </div>
          </Reveal>
          <Reveal delay={100}>
            <SectionHeading eyebrow="The difference" title="Water worthy of a spa" />
            <div className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-2">
              {benefits.map((b, i) => {
                const Icon = benefitIcons[i % benefitIcons.length]
                return (
                  <div key={b.title} className="border-t border-primary/25 pt-5">
                    <Icon className="h-5 w-5 text-primary" strokeWidth={1.25} />
                    <h3 className="mt-3 font-display text-lg text-foreground">{b.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.body}</p>
                  </div>
                )
              })}
            </div>
          </Reveal>
        </div>
      </Section>

      {/* Featured shower heads */}
      <Section className="pt-0">
        <Reveal className="mb-8 flex items-end justify-between gap-4">
          <SectionHeading eyebrow="Shower heads" title="Our flagship showers" />
          <Link to="/collections/shower-heads" className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-primary hover:text-accent sm:block">
            View all
          </Link>
        </Reveal>
        {products.loading ? (
          <Loading />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {featured.map((p, i) => (
              <Reveal key={p.handle} delay={i * 70}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        )}
      </Section>

      {/* Social proof — real customer + hotel-spa testimonials from aromasenseusa.com/pages/the-buzz */}
      <Section className="pt-0">
        <Reveal>
          <SectionHeading eyebrow="Trusted nationwide" title="What customers are saying" align="center" className="mx-auto" />
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {testimonials.slice(0, 3).map((t, i) => (
            <Reveal key={t.name} delay={i * 80}>
              <figure className="flex h-full flex-col rounded-lg border border-primary/15 bg-card p-6">
                <Quote className="h-5 w-5 text-primary" strokeWidth={1.5} />
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-5 text-xs font-semibold uppercase tracking-wide text-foreground">
                  {t.name} <span className="font-normal normal-case text-muted-foreground">· {t.role}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
        <Reveal delay={240}>
          <p className="mt-8 text-center text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            As featured in {press.map((p) => p.outlet).join(' · ')}
          </p>
        </Reveal>
      </Section>

      {/* The ritual — editorial 3-step */}
      <div className="bg-vignette border-y border-primary/15">
        <Section>
          <Reveal>
            <SectionHeading
              eyebrow="The ritual"
              title="Filter. Infuse. Restore."
              description="One cartridge does the work of a whole shelf of products — every time you turn the tap."
              align="center"
              className="mx-auto"
            />
          </Reveal>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {ritual.map((r, i) => (
              <Reveal key={r.step} delay={i * 90}>
                <div className="group">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-primary/20">
                    <img
                      src={r.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                    <span className="absolute left-4 top-3 font-display text-3xl italic text-[#f0dcae] drop-shadow">
                      {r.step}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-xl text-foreground">{r.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>
      </div>

      {/* Spa partners marquee */}
      <div className="border-b border-primary/15 bg-card py-10">
        <Container>
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
            As specified by the world's finest hotel spas
          </p>
        </Container>
        <div className="mt-7 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="marquee flex w-max gap-16 pr-16">
            {[...spaPartners, ...spaPartners].map((name, i) => (
              <span key={i} className="font-display text-2xl italic text-muted-foreground">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Starter kits */}
      <Section>
        <Reveal className="mb-8 flex items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Starter kits"
            title="Everything you need in one box"
            description="A shower head, microfiber filters and a 3-pack of scented vitamin C cartridges."
          />
          <Link to="/collections/starter-kits" className="hidden shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary hover:text-accent sm:block">
            View all
          </Link>
        </Reveal>
        {products.loading ? (
          <Loading />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {bestsellers.map((p, i) => (
              <Reveal key={p.handle} delay={i * 70}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        )}
      </Section>

      {/* Lookbook */}
      <Section className="pt-0">
        <Reveal>
          <SectionHeading eyebrow="Lookbook" title="A quieter kind of luxury" />
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {gallery.map((g, i) => (
            <Reveal key={g.src} delay={i * 70} className={i === 0 ? 'col-span-2 row-span-2' : ''}>
              <figure className="group relative h-full overflow-hidden rounded-lg border border-primary/15">
                <img
                  src={g.src}
                  alt={g.caption}
                  loading="lazy"
                  decoding="async"
                  className={`w-full object-cover transition duration-700 group-hover:scale-105 ${
                    i === 0 ? 'aspect-square lg:aspect-[4/5]' : 'aspect-square'
                  }`}
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-3 text-[11px] font-medium uppercase tracking-[0.14em] text-foreground/90">
                  {g.caption}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Blog teasers */}
      {posts.length > 0 && (
        <Section className="pt-0">
          <Reveal className="mb-8 flex items-end justify-between gap-4">
            <SectionHeading eyebrow="Journal" title="From the Aroma Sense blog" />
            <Link to="/blog" className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-primary hover:text-accent sm:block">
              All articles
            </Link>
          </Reveal>
          <div className="grid gap-6 sm:grid-cols-3">
            {posts.map((a, i) => (
              <Reveal key={a.handle} delay={i * 80}>
                <Link to={`/blog/${a.handle}`} className="group flex h-full flex-col">
                  {a.image && (
                    <div className="mb-4 aspect-[3/2] overflow-hidden rounded-md border border-border">
                      <img
                        src={a.image}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <h3 className="font-display text-lg leading-snug text-foreground transition-colors group-hover:text-primary">
                    {a.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {a.excerpt}
                  </p>
                </Link>
              </Reveal>
            ))}
          </div>
        </Section>
      )}
    </>
  )
}
