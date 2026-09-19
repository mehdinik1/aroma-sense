export type Variant = {
  id: number
  title: string | null
  sku: string | null
  priceCents: number
  compareAtCents: number
  available: boolean
  stock?: number
}

export type Product = {
  id: number
  handle: string
  title: string
  description: string
  metaDescription?: string
  bodyHtml: string
  vendor: string
  productType: string
  tags: string[]
  images: string[]
  variants: Variant[]
  featured: boolean
  visible: boolean
  stock: number
  priceFromCents: number
  compareAtCents: number
}

export type Collection = {
  handle: string
  title: string
  description: string
  productHandles: string[]
}

export type BlogArticle = {
  handle: string
  title: string
  excerpt: string
  image: string | null
  author: string
  publishedAt: string | null
  bodyHtml: string
}

export type ContentPage = {
  slug: string
  title: string
  bodyHtml: string
}

export type OrderItem = {
  productHandle: string
  variantId: number
  title: string
  variantTitle: string | null
  priceCents: number
  quantity: number
  image: string | null
}

export type Order = {
  id: number
  reference: string
  status: 'pending' | 'paid' | 'fulfilled' | 'cancelled'
  email: string | null
  customerName: string | null
  shippingAddress: string | null
  subtotalCents: number
  shippingCents: number
  totalCents: number
  trackingNumber: string | null
  stripeSessionId: string | null
  createdAt: string
  items: OrderItem[]
}

export type ContactMessage = {
  id: number
  name: string
  email: string
  message: string
  topic: string
  orderReference: string | null
  company: string | null
  quantity: string | null
  createdAt: string
  handled: number
}

export type Customer = {
  id: number
  email: string
  name: string | null
  points: number
}

export type RewardsInfo = {
  points: number
  valueCents: number
  pointsPerDollar: number
  redeemStep: number
  redeemValueCents: number
}

export type Address = {
  id: number
  name: string
  line1: string
  line2: string | null
  city: string
  state: string
  postalCode: string
  phone: string | null
  isDefault: boolean
}

export type AddressInput = {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  phone?: string
  isDefault?: boolean
}

export type PointsLedgerEntry = {
  delta: number
  reason: string
  orderReference: string | null
  createdAt: string
}

export type AccountOrder = {
  reference: string
  status: string
  createdAt: string
  subtotalCents: number
  shippingCents: number
  discountCents: number
  discountCode: string | null
  totalCents: number
  pointsEarned: number
  pointsRedeemed: number
  trackingNumber: string | null
  shippingAddress: string | null
  isSubscription: boolean
  items: OrderItem[]
}

export type Subscription = {
  id: number
  status: string
  productHandle: string
  title: string
  variantTitle: string | null
  unitPriceCents: number
  quantity: number
  interval: string
  currentPeriodEnd: string | null
}

export type AdminCustomer = {
  id: number
  email: string
  name: string | null
  points: number
  createdAt: string
  orderCount: number
  totalSpentCents: number
}

export type AdminCustomerDetail = AdminCustomer & {
  orders: Order[]
  addresses: Omit<Address, 'id'>[]
  pointsLedger: PointsLedgerEntry[]
}

export type DiscountCode = {
  code: string
  percentOff: number
  active: boolean
  maxRedemptions: number | null
  redeemedCount: number
  createdAt: string
}

export type NewsletterSubscriber = {
  email: string
  createdAt: string
}

export type StoreConfig = {
  paymentsEnabled: boolean
  welcomeCode: string
  welcomeDiscountPct: number
  loyalty: {
    pointsPerDollar: number
    redeemStep: number
    redeemValueCents: number
    subscriptionDiscountPct: number
    subscribableTypes: string[]
  }
}
