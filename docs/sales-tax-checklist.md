# Sales tax — checklist for you and your accountant

The store can collect sales tax through **Stripe Tax**, but it is switched **off** until you decide to
turn it on. This is a legal and financial decision, not a technical one, so please confirm the points
below with an accountant who handles US sales tax. This page is orientation, not tax advice.

## What is true today

- The store sells to **US addresses only**, shipped by USPS or UPS, and **collects no sales tax**.
- Prices are shown tax-exclusive (tax would be added at checkout, the normal US convention).
- The Stripe account belongs to a **Canadian company (1267905 B.C. Ltd.)**; the business mailing
  address is in **California**.
- Stripe Tax only charges tax **in places where you have an active registration**. Turning it on
  cannot collect tax in a state you have not registered in.

## Questions for your accountant

1. **Where do you have a physical presence?** Inventory, a warehouse, a fulfilment partner, employees or
   contractors in a state can create an obligation to collect tax there. Where is stock shipped from?
2. **California:** you have a California address. Do you need a California seller's permit, and do you
   collect California tax on California deliveries?
3. **Economic nexus:** many states require out-of-state sellers to register once sales into the state pass
   a threshold (commonly around $100,000 of sales, and in some states a transaction count). Which states
   should you watch? Stripe's Tax dashboard has a threshold monitor once enabled.
4. **What is taxable?** Are shower heads, vitamin C cartridges, filters, spare parts and gift or bundled
   items taxable in each state? Is **shipping** taxable (it varies by state)?
5. **Canada:** as a Canadian company selling to the US, do you also need to consider GST/HST treatment
   of exports, and import duties or customs paperwork on the goods?
6. **Filing:** who files and remits in each state, and how often?

## Turning it on (once your accountant has confirmed)

1. In the Stripe Dashboard go to **Tax**, then enter the **head office / origin address**.
2. Add a **registration** for each state where you are registered to collect.
3. Under **Tax settings** choose your **default product tax category**, **default shipping tax code**, and
   set **tax behavior** to exclusive. (The store does not guess product tax categories.)
4. Tell your developer to set `STRIPE_TAX=1` on the API Worker and deploy. Checkout will then add tax,
   the order and emails will show a **Tax** line, and orders will store the tax collected.
5. Make a test purchase to a registered state and check the amount, then refund it.
6. Match the **tax settings in Google Merchant Center** to the same states.

## What changes when it is on

- Checkout adds tax based on the shipping address, only where you are registered.
- The cart shows a "Tax — calculated at checkout" line.
- Order confirmation emails and the customer's order page show a separate **Tax** line, and the order
  record stores the tax amount for your books.
