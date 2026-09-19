export const site = {
  name: 'Aroma Sense',
  tagline: 'Vitamin C aromatherapy showers',
  email: 'hello@vitamincshower.com',
  phone: '+1 (800) 000-0000', // TODO: confirm real number
  shippingNote: 'Free shipping across the United States · U.S. orders only',
  currencyNote: 'All prices in USD',
  social: {
    instagram: '#',
    facebook: '#',
    pinterest: '#',
    youtube: '#',
  },
}

export type NavLink = { label: string; to: string; note?: string }
export type MegaSection = { title: string; links: NavLink[] }
export type MegaFeature = {
  image: string
  eyebrow: string
  title: string
  to: string
  cta: string
}
export type NavItem = {
  label: string
  to: string
  sections?: MegaSection[]
  feature?: MegaFeature
}

export const nav: NavItem[] = [
  { label: 'Get Started', to: '/build' },
  {
    label: 'Shop',
    to: '/shop',
    sections: [
      {
        title: 'Shower Heads',
        links: [
          { label: 'All Shower Heads', to: '/collections/shower-heads' },
          { label: 'Handheld', to: '/collections/shower-heads', note: 'Luxe · Prestige · Large · Medium' },
          { label: 'Wall Mounted', to: '/collections/shower-heads', note: 'Rainfall · Jet · Wall' },
          { label: 'Build a Kit', to: '/build' },
        ],
      },
      {
        title: 'Refills & Care',
        links: [
          { label: 'Vitamin C Cartridges', to: '/collections/vitamin-c-cartridges' },
          { label: 'Microfiber Filters', to: '/products/microfiber-filters-5-in-1' },
          { label: 'Hose & Bracket', to: '/products/hose-bracket' },
          { label: 'Spare Parts', to: '/collections/spare-parts' },
        ],
      },
      {
        title: 'Collections',
        links: [
          { label: 'New Products', to: '/collections/new-products', note: 'Just landed' },
          { label: 'Starter Kits', to: '/collections/starter-kits' },
          { label: 'Deal of the Month', to: '/deal-of-the-month' },
        ],
      },
    ],
    feature: {
      image: '/products/as-luxe/0.jpg',
      eyebrow: 'Bestseller',
      title: 'Luxe Handheld Vitamin C Shower Head',
      to: '/products/as-luxe',
      cta: 'Shop now',
    },
  },
  {
    label: 'About',
    to: '/why-aroma-sense',
    sections: [
      {
        title: 'The Brand',
        links: [
          { label: 'Why Aroma Sense?', to: '/why-aroma-sense' },
          { label: 'The Buzz', to: '/the-buzz', note: 'Reviews & press' },
          { label: 'Rewards', to: '/rewards' },
          { label: 'Blog', to: '/blog' },
        ],
      },
      {
        title: 'Help',
        links: [
          { label: 'How It Works', to: '/how-it-works' },
          { label: 'Installation & Maintenance', to: '/installation' },
          { label: 'FAQ', to: '/faq' },
          { label: 'Contact Us', to: '/contact' },
        ],
      },
    ],
    feature: {
      image: '/art/feature-wide.svg',
      eyebrow: 'The story',
      title: 'The hotel-spa shower, at home',
      to: '/why-aroma-sense',
      cta: 'Read more',
    },
  },
  { label: 'The Buzz', to: '/the-buzz' },
  { label: 'Rewards', to: '/rewards' },
  { label: 'Blog', to: '/blog' },
  { label: 'Contact Us', to: '/contact' },
]

export const spaPartners = [
  'Four Seasons',
  'The Ritz-Carlton',
  'Hilton',
  'Hotel del Coronado',
  'Catamaran Resort',
  'Naples Beach Club',
]

export const benefits = [
  {
    title: 'Filters chlorine',
    body: 'Pharmaceutical-grade vitamin C neutralizes chlorine, so water is softer and kinder on hair, skin and nails.',
  },
  {
    title: 'Real aromatherapy',
    body: 'Natural essential-oil cartridges release scent through the spray for an uplifting, spa-like shower.',
  },
  {
    title: 'Stronger pressure',
    body: 'Precision nozzles optimize flow up to 1.5× standard shower heads while using less water.',
  },
  {
    title: 'Negative ions',
    body: 'Up to four times more negative ions to support circulation and a calm, refreshed feeling.',
  },
]
