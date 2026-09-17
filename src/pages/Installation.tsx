import { PageHero } from '@/components/site/PageHero'
import { Container } from '@/components/site/Container'
import { lifestyle } from '@/data/lifestyle'

const wall = [
  'Unscrew your existing shower head from the wall arm by turning counter-clockwise (hand-tight is usually enough; use a cloth and pliers if needed).',
  'Peel off the old thread tape from the wall arm and wrap 3–4 turns of fresh PTFE (plumber’s) tape clockwise around the threads.',
  'Screw the Aroma Sense head onto the arm by hand until snug, then a quarter turn more with a cloth-wrapped wrench. Do not overtighten.',
  'Open the cartridge bay, drop in a vitamin C cartridge, and close it.',
  'Run the shower for 30 seconds to flush the filter and check for drips at the connection.',
]

const handheld = [
  'Unscrew the hose from your existing wall outlet or diverter.',
  'Wrap fresh PTFE tape clockwise around the outlet threads.',
  'Attach the shower hose to the wall outlet, then attach the Aroma Sense handheld head to the other end of the hose. Rubber washers should already be seated inside each fitting.',
  'Load a vitamin C cartridge into the head.',
  'Run water for 30 seconds to flush and check every connection for leaks.',
]

export function Installation() {
  return (
    <>
      <PageHero
        eyebrow="Installation"
        title="Installs in about five minutes"
        description="No plumber and no tools required for most bathrooms. Aroma Sense heads fit the standard ½-inch connection used across North America."
        image={lifestyle.showerAlt}
      />
      <Container className="py-12">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold">Wall-mounted heads</h2>
            <ol className="mt-4 space-y-3">
              {wall.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{s}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Handheld heads</h2>
            <ol className="mt-4 space-y-3">
              {handheld.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{s}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
              Handheld heads do not fit every existing hose. If your current hose is worn or an
              unusual size, add the Aroma Sense hose &amp; bracket to your order.
            </p>
          </div>
        </div>
      </Container>
    </>
  )
}
