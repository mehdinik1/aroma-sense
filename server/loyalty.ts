// Aroma Sense Rewards — points rules. Change these freely.

export const loyalty = {
  /** points earned per $1 (100 cents) spent on a paid order */
  pointsPerDollar: 1,
  /** points required to redeem … */
  redeemStep: 100,
  /** … for this much off, in cents */
  redeemValueCents: 500,
  /** you can't pay for more than this share of an order with points */
  maxRedeemFractionOfOrder: 0.5,
  /** subscribe & save discount on eligible (consumable) products */
  subscriptionDiscountPct: 15,
}

export function pointsForSpend(cents: number): number {
  return Math.floor((cents / 100) * loyalty.pointsPerDollar)
}

/** Largest redeemable point amount given a balance and an order subtotal. */
export function maxRedeemablePoints(balance: number, subtotalCents: number): number {
  const byBalance = Math.floor(balance / loyalty.redeemStep) * loyalty.redeemStep
  const capCents = Math.floor(subtotalCents * loyalty.maxRedeemFractionOfOrder)
  const byOrder = Math.floor(capCents / loyalty.redeemValueCents) * loyalty.redeemStep
  return Math.max(0, Math.min(byBalance, byOrder))
}

export function redeemCents(points: number): number {
  return (points / loyalty.redeemStep) * loyalty.redeemValueCents
}

/** Product types that can be put on a Subscribe & Save plan. */
export const SUBSCRIBABLE_TYPES = new Set(['Vitamin C Cartridges', 'Microfiber filters'])

/** First-order incentive shown on the newsletter signup — seeded once as a real, working
 *  discount code (see server/db.ts). Admins can disable/delete it from the Discounts tab;
 *  it will not be recreated once it has existed. */
export const WELCOME_DISCOUNT_CODE = 'WELCOME10'
export const WELCOME_DISCOUNT_PCT = 10
