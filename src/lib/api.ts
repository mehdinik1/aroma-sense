import type {
  AccountOrder,
  AdminCustomer,
  AdminCustomerDetail,
  Address,
  AddressInput,
  BlogArticle,
  Collection,
  ContactMessage,
  ContentPage,
  Customer,
  DiscountCode,
  NewsletterSubscriber,
  Order,
  PointsLedgerEntry,
  Product,
  RewardsInfo,
  StoreConfig,
  Subscription,
} from './types'

// Pages (this frontend) and the Cloudflare Worker (the API) are always different origins —
// set at build time via `VITE_API_URL` (e.g. https://aroma-sense-api.<you>.workers.dev/api).
// Falls back to a relative path for local dev, where Vite proxies /api to `wrangler dev`.
const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // cross-site cookies — see server/auth.ts / customerAuth.ts
    ...init,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    throw new ApiError(data?.error || res.statusText, res.status, data?.code)
  }
  return data as T
}

export class ApiError extends Error {
  status: number
  code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const api = {
  products: () => req<Product[]>('/products'),
  product: (handle: string) => req<Product>(`/products/${handle}`),
  collections: () => req<Collection[]>('/collections'),
  collection: (handle: string) => req<{ collection: Collection; products: Product[] }>(`/collections/${handle}`),
  blog: () => req<BlogArticle[]>('/blog'),
  article: (handle: string) => req<BlogArticle>(`/blog/${handle}`),
  page: (slug: string) => req<ContentPage>(`/pages/${slug}`),
  contact: (body: { name: string; email: string; message: string }) =>
    req<{ ok: true }>('/contact', { method: 'POST', body: JSON.stringify(body) }),
  checkout: (
    items: { variantId: number; quantity: number; subscribe?: boolean }[],
    opts: { pointsToRedeem?: number; kit?: boolean; discountCode?: string } = {},
  ) =>
    req<{ url: string }>('/checkout', {
      method: 'POST',
      body: JSON.stringify({ items, pointsToRedeem: opts.pointsToRedeem ?? 0, kit: !!opts.kit, discountCode: opts.discountCode }),
    }),
  config: () => req<StoreConfig>('/config'),
  validateDiscountCode: (code: string) =>
    req<{ valid: boolean; code?: string; percentOff?: number; message?: string }>('/discount/validate', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  newsletter: (email: string) =>
    req<{ ok: true; code: string; percentOff: number }>('/newsletter', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  account: {
    me: () => req<{ customer: Customer; rewards: RewardsInfo }>('/account/me'),
    register: (email: string, password: string, name: string) =>
      req<{ customer: Customer }>('/account/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }),
    login: (email: string, password: string) =>
      req<{ customer: Customer }>('/account/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    logout: () => req<{ ok: true }>('/account/logout', { method: 'POST' }),
    forgotPassword: (email: string) =>
      req<{ ok: true }>('/account/forgot', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: (token: string, password: string) =>
      req<{ ok: true }>('/account/reset', { method: 'POST', body: JSON.stringify({ token, password }) }),
    updateProfile: (body: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) =>
      req<{ customer: Customer }>('/account/me', { method: 'PATCH', body: JSON.stringify(body) }),
    wishlist: () => req<{ handles: string[] }>('/account/wishlist'),
    addWishlist: (handle: string) =>
      req<{ handles: string[] }>('/account/wishlist', { method: 'POST', body: JSON.stringify({ handle }) }),
    removeWishlist: (handle: string) =>
      req<{ handles: string[] }>(`/account/wishlist/${handle}`, { method: 'DELETE' }),
    orders: () => req<AccountOrder[]>('/account/orders'),
    order: (reference: string) => req<AccountOrder>(`/account/orders/${reference}`),
    addresses: () => req<Address[]>('/account/addresses'),
    addAddress: (body: AddressInput) =>
      req<Address[]>('/account/addresses', { method: 'POST', body: JSON.stringify(body) }),
    updateAddress: (id: number, body: Partial<AddressInput>) =>
      req<Address[]>(`/account/addresses/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteAddress: (id: number) =>
      req<Address[]>(`/account/addresses/${id}`, { method: 'DELETE' }),
    points: () =>
      req<{
        balance: number
        valueCents: number
        rules: { pointsPerDollar: number; redeemStep: number; redeemValueCents: number }
        ledger: PointsLedgerEntry[]
      }>('/account/points'),
    subscriptions: () => req<Subscription[]>('/account/subscriptions'),
    billingPortal: () => req<{ url: string }>('/account/billing-portal', { method: 'POST' }),
  },

  admin: {
    me: () => req<{ email: string }>('/admin/me'),
    login: (email: string, password: string) =>
      req<{ email: string }>('/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    logout: () => req<{ ok: true }>('/admin/logout', { method: 'POST' }),
    stats: () => req<{
      revenueCents: number
      orderCount: number
      pendingCount: number
      lowStock: { handle: string; title: string; stock: number }[]
      unreadMessages: number
      newsletterSubscribers: number
    }>('/admin/stats'),
    newsletterSubscribers: () => req<NewsletterSubscriber[]>('/admin/newsletter-subscribers'),
    products: () => req<Product[]>('/admin/products'),
    updateProduct: (
      handle: string,
      patch: Partial<{ priceCents: number; compareAtCents: number; stock: number; visible: boolean; featured: boolean }>,
    ) => req<Product>(`/admin/products/${handle}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    orders: () => req<Order[]>('/admin/orders'),
    updateOrder: (id: number, patch: Partial<{ status: string; trackingNumber: string }>) =>
      req<Order>(`/admin/orders/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    messages: () => req<ContactMessage[]>('/admin/contact-messages'),
    markMessage: (id: number, handled: boolean) =>
      req<ContactMessage>(`/admin/contact-messages/${id}`, { method: 'PATCH', body: JSON.stringify({ handled }) }),
    customers: () => req<AdminCustomer[]>('/admin/customers'),
    customer: (id: number) => req<AdminCustomerDetail>(`/admin/customers/${id}`),
    adjustPoints: (id: number, delta: number, reason: string) =>
      req<{ points: number }>(`/admin/customers/${id}/points`, { method: 'POST', body: JSON.stringify({ delta, reason }) }),
    changePassword: (currentPassword: string, newPassword: string) =>
      req<{ ok: true }>('/admin/me/password', { method: 'PATCH', body: JSON.stringify({ currentPassword, newPassword }) }),
    discountCodes: () => req<DiscountCode[]>('/admin/discount-codes'),
    createDiscountCode: (body: { code: string; percentOff: number; maxRedemptions?: number }) =>
      req<DiscountCode>('/admin/discount-codes', { method: 'POST', body: JSON.stringify(body) }),
    setDiscountCodeActive: (code: string, active: boolean) =>
      req<DiscountCode>(`/admin/discount-codes/${code}`, { method: 'PATCH', body: JSON.stringify({ active }) }),
    deleteDiscountCode: (code: string) =>
      req<{ ok: true }>(`/admin/discount-codes/${code}`, { method: 'DELETE' }),
  },
}
