// Shared by the contact form (browser) and the contact endpoint / alert email (server).
export const CONTACT_TOPICS = [
  { value: 'order', label: 'Order inquiry', hint: 'Include your order reference (from your confirmation email) so we can look it up quickly.' },
  { value: 'bulk', label: 'Bulk & wholesale order', hint: 'Outfitting a hotel, gym, spa or property? Tell us about it and we will follow up with volume pricing.' },
  { value: 'product', label: 'Product question', hint: 'Ask about features, scents, cartridges or which shower head suits your bathroom.' },
  { value: 'installation', label: 'Installation & fit help', hint: 'Tell us your shower setup (wall arm, hose, handheld) and we will help you get the right fit.' },
  { value: 'returns', label: 'Returns, warranty & replacements', hint: 'Include your order reference and describe what needs replacing or returning.' },
  { value: 'rewards', label: 'Rewards & account', hint: 'Questions about points, discount codes or your account.' },
  { value: 'other', label: 'Something else', hint: 'Anything else on your mind.' },
] as const

export type ContactTopic = (typeof CONTACT_TOPICS)[number]['value']
export const CONTACT_TOPIC_VALUES = CONTACT_TOPICS.map((t) => t.value) as [ContactTopic, ...ContactTopic[]]
export const topicLabel = (v: string) => CONTACT_TOPICS.find((t) => t.value === v)?.label ?? 'Something else'
export const isTopic = (v: string | null | undefined): v is ContactTopic => CONTACT_TOPICS.some((t) => t.value === v)

export const BULK_QUANTITIES = ['5–10', '11–25', '26–50', '51–100', '100+'] as const
export const TOPICS_WITH_ORDER_REF: ContactTopic[] = ['order', 'returns']
