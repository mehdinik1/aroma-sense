import { Link } from 'react-router-dom'
import { PageHero } from '@/components/site/PageHero'
import { Section } from '@/components/site/Container'
import { Reveal } from '@/components/site/Reveal'
import { lifestyle } from '@/data/lifestyle'

const stages = [
  {
    step: '01',
    title: 'Water enters the filter chamber',
    body: 'As you turn on the shower, water flows through the Aroma Sense head and past a microfiber filter that traps rust, sediment and other particles picked up in your pipes.',
  },
  {
    step: '02',
    title: 'Vitamin C neutralizes chlorine',
    body: 'A replaceable cartridge releases pharmaceutical-grade vitamin C (sodium ascorbate) into the stream. It chemically neutralizes the chlorine and chloramine used to treat municipal water, which is what leaves hair and skin feeling dry and tight.',
  },
  {
    step: '03',
    title: 'Essential oils release their aroma',
    body: 'The same cartridge is infused with natural essential oils. Warm water carries the scent into the air for genuine aromatherapy — lavender to unwind, citrus to wake up, eucalyptus to breathe easier.',
  },
  {
    step: '04',
    title: 'Precision nozzles boost pressure',
    body: 'Hundreds of small spray holes and an internal flow design increase perceived water pressure up to 1.5× a standard head while using less water. A negative-ion plate adds up to four times more negative ions to the spray.',
  },
]

export function HowItWorks() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title="Filtered water, real aromatherapy, stronger pressure"
        description="Every Aroma Sense shower head does four things at once, powered by a single vitamin C cartridge you swap about once a month."
        image={lifestyle.shower}
      />
      <Section>
        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {stages.map((s, i) => (
            <Reveal key={s.step} delay={i * 70}>
              <div className="border-t border-primary/25 pt-5">
                <span className="font-display text-3xl italic text-primary">{s.step}</span>
                <h2 className="mt-2 font-display text-lg text-foreground">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-14 grid gap-8 rounded-lg border border-primary/20 bg-card p-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <h2 className="font-display text-2xl text-foreground">How long does a cartridge last?</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            A cartridge lasts roughly one month of daily showers, depending on how long you shower
            and how heavily your water is chlorinated. You'll notice the scent fade when it's time
            for a new one. Cartridges are sold singly and in scent 3-packs.
          </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/collections/vitamin-c-cartridges"
                className="inline-flex h-11 items-center rounded-full bg-primary px-7 text-[12px] font-semibold uppercase tracking-[0.08em] text-primary-foreground transition hover:bg-accent"
              >
                Shop cartridges
              </Link>
              <Link
                to="/collections/starter-kits"
                className="inline-flex h-11 items-center rounded-full border border-primary/45 px-7 text-[12px] font-semibold uppercase tracking-[0.08em] text-primary transition hover:bg-primary/10"
              >
                Shop starter kits
              </Link>
            </div>
          </div>
          <div className="aspect-[4/5] overflow-hidden rounded-lg border border-primary/20">
            <img src={lifestyle.hair} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
      </Section>
    </>
  )
}
