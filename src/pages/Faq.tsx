import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { PageHero } from '@/components/site/PageHero'
import { Container } from '@/components/site/Container'
import { cn } from '@/lib/utils'

const faqs = [
  {
    q: 'How often do I replace the vitamin C cartridge?',
    a: 'About once a month with daily use. It depends on shower length and how heavily your local water is chlorinated. When the scent fades noticeably, it is time for a new one.',
  },
  {
    q: 'Will it fit my shower?',
    a: 'Yes for the vast majority of homes. Aroma Sense heads use the standard ½-inch (NPT) connection used across the US. Wall-mounted models screw straight onto the wall arm; handheld models connect to a standard shower hose.',
  },
  {
    q: 'Does it really increase water pressure?',
    a: 'Perceived pressure, yes. The nozzle design concentrates and accelerates the spray, so it feels stronger — up to about 1.5× a basic head — while actually using less water.',
  },
  {
    q: 'What scents are available?',
    a: 'Lavender, Lemon, White Citrus, Blue Ocean, Mandarin Tea, Tea Tree Lavender and Deep in the Forest, among others. You can mix scents in a cartridge 3-pack.',
  },
  {
    q: 'Do you ship outside the United States?',
    a: 'Not at this time. We currently ship to addresses within the United States only, and all prices are in US dollars.',
  },
  {
    q: 'How much is shipping?',
    a: 'Standard shipping is free everywhere in the US (3–6 business days). An expedited 2-day option is available at checkout.',
  },
  {
    q: 'What is your return policy?',
    a: 'Unused items in original packaging can be returned within 30 days. Cartridges and bath products cannot be returned once opened for hygiene reasons.',
  },
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <>
      <PageHero eyebrow="FAQ" title="Frequently asked questions" />
      <Container className="py-12">
        <div className="mx-auto max-w-2xl divide-y divide-border rounded-2xl border border-border bg-card">
          {faqs.map((item, i) => (
            <div key={i}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-sm font-medium">{item.q}</span>
                <ChevronDown
                  className={cn('h-4 w-4 shrink-0 transition', open === i && 'rotate-180')}
                />
              </button>
              {open === i && <p className="px-5 pb-5 text-sm text-muted-foreground">{item.a}</p>}
            </div>
          ))}
        </div>
      </Container>
    </>
  )
}
