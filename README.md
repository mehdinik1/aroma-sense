# Aroma Sense — store rebuild

A coded rebuild of the **aromasenseusa.com** Shopify store as a fast React storefront with
its own backend (admin login, orders, Stripe checkout). Built **local-first**; the stack
matches Lovable so it can move there with minimal rework.

Rebrand: the store is **"Aroma Sense"** (no "USA"). **USD only. Ships to the United States
only.** Checkout is Stripe-hosted, which gives **Apple Pay + Google Pay** automatically.

## Stack

- **Frontend** — Vite + React 19 + TypeScript, Tailwind v3 (shadcn-style tokens in
  `src/index.css`), React Router v7, lucide-react
- **Backend** — Express + TypeScript, `node:sqlite` (built into Node 22+, no native build),
  Stripe, JWT cookie auth, zod
- One `npm run dev` runs both: web on **:5177**, API on **:8787** (Vite proxies `/api`).

## Run locally

```bash
cd aroma-sense
npm install
cp .env.example .env      # edit values (see below)
npm run dev
```

Open http://localhost:5177 · Admin at http://localhost:5177/admin

Other scripts: `npm run build` (typecheck + prod build), `npm run lint`,
`npm run scrape` (re-pull catalog/blog from the live store).

## Environment (`.env`)

| var | notes |
|---|---|
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | the admin login. Seeded into the DB on first run. To change the password later, delete `server/data.db` and restart, or update the `admin_users` row. |
| `JWT_SECRET` | any long random string — signs the admin session cookie |
| `API_PORT` | default `8787` |
| `APP_URL` | `http://localhost:5177` locally — used for Stripe redirect URLs |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` | from Stripe → Developers → API keys. **Test mode** keys start with `sk_test_` / `pk_test_`. The site runs without them, but checkout stays disabled until `STRIPE_SECRET_KEY` is set. |
| `STRIPE_WEBHOOK_SECRET` | printed by `stripe listen` (below) |

## Enabling checkout (Stripe)

1. Create a free Stripe account, stay in **Test mode**.
2. Put the test keys in `.env`, restart `npm run dev`.
3. Forward webhooks so paid orders get marked paid:
   ```bash
   stripe listen --forward-to localhost:8787/api/webhooks/stripe
   ```
   Copy the `whsec_…` it prints into `STRIPE_WEBHOOK_SECRET`, restart.
4. Check out with test card `4242 4242 4242 4242`, any future date/CVC. Apple Pay /
   Google Pay appear automatically on supported devices/browsers.
5. `stripe trigger checkout.session.completed` also works for testing the webhook.

Checkout is configured for `currency: usd` and `shipping_address_collection` limited to
`US`. Prices are always recomputed server-side from the catalog — the client cart total is
never trusted.

## Project layout

```
scripts/scrape.mjs      Pulls products, collections + blog text from aromasenseusa.com
                        (forces the US/USD Shopify market). Output is committed.
                        Blog/lifestyle photography is NOT reused — the scrape step
                        clears every article image and calls gen-art.mjs instead.
scripts/gen-art.mjs     Generates all editorial imagery as original branded SVG:
                        140 blog covers -> public/blog-art/<handle>.svg, plus 13
                        storefront panels -> public/art/*.svg (hero, ritual-1..3,
                        feature-*, look-1..4, page-1..3). Deterministic per handle
                        (FNV hash + seeded PRNG), champagne-gold on warm black,
                        three styles (water contours / ripples / luminous droplet).
                        `--purge` also deletes the old scraped public/blog/ dir.
server/
  index.ts              Express app
  db.ts                 node:sqlite schema + seed + loads server/data/*.json
  catalog.ts            merges scraped catalog with admin overrides -> API product shape
  loyalty.ts            Aroma Sense Rewards point rules (earn/redeem rates, sub discount)
  customerAuth.ts       customer session cookie (separate from admin)
  routes/
    public.ts           /api/products, /collections, /blog, /pages, /contact, /config
    checkout.ts         POST /api/checkout -> Stripe Checkout (payment OR subscription),
                        server-side pricing, points redemption, Stripe customer reuse
    webhook.ts          /api/webhooks/stripe -> order paid, stock--, award points,
                        upsert subscriptions
    account.ts          register/login/me + orders, addresses, points ledger,
                        subscriptions, Stripe billing-portal session
    admin.ts            login/logout/me + /admin/stats, /orders, /products, /contact-messages
  data/
    catalog.json        products + variants (prices in cents, USD)
    collections.json    collection membership
    blog.json           140 articles (sanitized HTML bodies, no <img>; each
                        `image` points at /blog-art/<handle>.svg)
    pages.json          hand-written policy pages (shipping/returns/privacy/terms)
  data.db               local SQLite (gitignored) — overrides, orders, customers,
                        addresses, points_ledger, subscriptions, messages, admin user
src/
  data/site.ts          nav, footer, brand strings, benefit copy  <- edit copy here
  data/lifestyle.ts     maps storefront art slots (hero, ritual, lookbook) to
                        /art/*.svg — all generated, no stock photography
  index.css             design tokens (black + champagne-gold luxe palette, Cormorant
                        Garamond display serif) + .photo-tile / motion utilities  <- theme here
  lib/                  api client, cart, account context, store cache, types
  components/site|ui|shop
  pages/                storefront pages
  pages/account/        login/register, overview, orders, addresses, rewards,
                        subscriptions, billing
  pages/admin/          AdminLogin, AdminDashboard (overview / orders / products / messages)
```

### Accessibility

A floating **Accessibility** button (bottom-left) opens a panel where visitors choose:
text size (Default / Large / Larger), contrast (Normal / High), motion (Normal / Reduced),
links (Default / Underlined), font (Default / Readable sans-serif), and focus outline
(Default / Enhanced). Choices persist per-device (`localStorage`) and are applied as
`data-a11y-*` attributes on `<html>` — see the rules at the bottom of `src/index.css`.
State lives in `src/lib/a11y.tsx` (`A11yProvider` / `useA11y`); UI in
`src/components/site/AccessibilityWidget.tsx`. There's also a keyboard "Skip to content"
link and the site respects the OS `prefers-reduced-motion` setting.

### Navigation

The header/footer mirror aromasenseusa.com: **Get Started · Shop · New Products · About ·
The Buzz · Rewards · Blog · Contact Us**, plus a **Search** icon (opens a search bar →
`/search`, live client-side product search), account and cart.

- `/the-buzz` — testimonials + press (content carried from the live page, in `src/data/buzz.ts`)
- `/deal-of-the-month` — resolves to whichever catalogue product is tagged the current
  month's deal
- Shop menu links straight to the Microfiber Filters and Hose & Bracket products
- Footer: Company / Support columns; `/pages/bulk-orders` and `/pages/warranty` added

### Build a Kit (`/build`, also `/collections/starter-pack`)

A 5-step configurator (shower-head type → head → cartridges → add-ons → review) that
mirrors the live store's Starter Pack page. Assembling a head + cartridge + microfiber
filter + ceramic beads unlocks **10% off the whole order**, re-validated server-side in
`checkout.ts` before the discount is applied. From the review step the shopper can add
everything to the cart or check out directly.

### Customer accounts

- Register / sign in at `/account` (separate from `/admin`). **Guest checkout stays on** —
  an account is optional.
- **Order history** (`/account/orders`) — a guest order is auto-linked when someone
  registers with the same email, and its points are granted retroactively.
- **Addresses** — save / edit / delete, mark a default.
- **Aroma Sense Rewards** — earn `1 pt / $1` on paid orders, redeem `100 pts = $5` in the
  cart (slider, signed-in only, capped at 50% of the order). Rules live in
  `server/loyalty.ts`. Full ledger at `/account/rewards`.
- **Subscribe & Save** — 15% off vitamin C cartridges & filters, billed monthly through
  Stripe subscriptions. Toggle on the product page / in the cart. Subscription items check
  out on their own (Stripe rule).
- **Payment & billing** (`/account/billing`) — opens the **Stripe Customer Portal** for
  saved cards, invoices, and subscription management. Needs Stripe keys; nothing card-
  related is stored in this app.

### What the admin can do

- See revenue, order count, unread messages, low-stock list
- View orders, set fulfillment status + tracking number
- Edit any product's price, compare-at price, stock, **Featured** and **Visible** flags —
  changes show on the storefront immediately (stored as overrides; re-scraping keeps them)
- Read contact-form messages, mark handled

## Refreshing the catalog

```bash
npm run scrape            # everything
npm run scrape products   # just products + images
npm run scrape blog-retry # re-fetch blog articles that previously failed
```
Re-seeding is idempotent — admin price/stock/visibility edits are preserved. Restart the
API after a scrape so it reloads `server/data/*.json`.

Product photos live in `public/products/<handle>/` (~68 MB), pulled from the live store.
Before pushing to a hosted repo, run them through an optimizer or move them to a CDN.

All editorial imagery (blog covers + storefront panels) is **generated, not scraped** —
none of aromasenseusa.com's blog/lifestyle photography is reused. Regenerate with:

```bash
node scripts/gen-art.mjs          # rewrite public/art/ + public/blog-art/ + blog.json
node scripts/gen-art.mjs --purge  # also delete any leftover scraped public/blog/
```

`npm run scrape` runs this automatically after pulling the blog text.

## Launching

Two paths from here — pick one:

- **Self-host this app as-is** (below). No rewrite: everything you've built — Stripe,
  accounts, loyalty, wishlist, discount codes, admin — keeps working exactly as it does
  locally. Recommended if you want to launch soon.
- **Migrate to Lovable** (next section). A rewrite onto Supabase — worth it only if you want
  Lovable's visual-editing workflow going forward; by now that means re-porting a lot of
  custom server logic (Stripe checkout/subscriptions, loyalty, wishlist, discount codes).

### 1. Pick a host

This is a normal Node/Express app with a **SQLite file** as its database
(`server/data.db`) — it needs a host with a real, *persistent* disk, not a serverless
platform (Vercel/Netlify functions won't keep the file between requests). Any of these work
with no code changes:

- **Railway**, **Render**, or **Fly.io** — attach a small persistent volume, point `DB_PATH`
  (below) at a path on it.
- A plain **VPS** (DigitalOcean, Hetzner, etc.) — the disk is just always there.

`npm run build` produces `dist/` (the frontend); `npm start` runs one Node process that
serves the API **and** the built frontend together on one port — no separate static host or
CORS setup needed.

### 2. Set production environment variables

Create these on the host (not in a committed file — `.env` stays local/gitignored):

| Variable | Set it to |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | usually set automatically by the host — leave `API_PORT` **unset** so this is honored |
| `APP_URL` | your real domain, e.g. `https://aromasense.com` (used in Stripe redirect/webhook URLs) |
| `JWT_SECRET` | a long random string — **do not reuse** the local dev value |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | your real admin login — **do not reuse** `aromasense-dev` |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` | **live** keys (`sk_live_…` / `pk_live_…`) once you've tested in test mode |
| `STRIPE_WEBHOOK_SECRET` | from a webhook endpoint pointed at `https://<your-domain>/api/webhooks/stripe` (Stripe Dashboard → Developers → Webhooks → Add endpoint) |
| `DB_PATH` | a path on the host's persistent volume, e.g. `/data/aroma-sense.db` |

### 3. Pre-launch checklist

- [ ] Test the full flow in Stripe **test mode** first (checkout, a Subscribe & Save order,
      the customer billing portal) before switching to live keys.
- [ ] Change the admin password from the default (`Admin → Settings`, or the env var above).
- [ ] Replace the placeholder email/phone in [`src/data/site.ts`](src/data/site.ts) (`site.email`,
      `site.phone` — currently marked `TODO`).
- [ ] Decide whether to keep or delete the seeded `WELCOME10` code (Admin → Discounts).
- [ ] `npm run build && npm run lint` clean.
- [ ] Point your domain's DNS at the host (host-specific — usually a CNAME/A record they give you).

### 4. Back up the database

`server/data.db` is now your source of truth for real orders, customers, and points once
live — it's not something `npm run scrape` regenerates. Back it up on a schedule (most hosts
with persistent volumes offer automatic snapshots; otherwise copy the file out periodically).

## Updating, day to day

Most changes don't need a code deploy at all:

- **Prices, stock, visibility, featured flag** → Admin → Products
- **Orders / fulfillment / tracking numbers** → Admin → Orders
- **Discount codes** → Admin → Discounts
- **Customers, manual point adjustments** → Admin → Customers
- **Contact messages, newsletter signups** → Admin → Messages

These take effect immediately, no restart or redeploy needed.

**Code changes** (new pages, design tweaks, new features) follow the normal flow: edit
locally, `npm run dev` to check it, then however you deploy (most hosts redeploy
automatically on `git push` to the connected branch; some need a manual "redeploy" click).
This repo has no git remote yet — `git init`, commit, and push to GitHub (or push directly to
your host, e.g. `git push railway main`) whenever you're ready to wire that up.

**Catalog changes** (new products, changed descriptions on the live Shopify store) — re-run
`npm run scrape`, review the diff in `server/data/*.json`, commit, redeploy. Admin overrides
(price/stock/visible/featured edits you made in the admin panel) are preserved across a
re-scrape.

## Moving to Lovable

Lovable uses the same frontend stack (Vite + React + TS + Tailwind + shadcn).

1. Create the Lovable project; bring `src/` over (or connect this repo on GitHub).
2. `src/data/site.ts` + `src/index.css` are the content/theme source of truth — hand those
   to Lovable's agent.
3. The backend rebuilds on **Supabase + Stripe edge functions**. The route contract in
   `server/routes/` maps 1:1:
   - all SQLite tables (`product_overrides`, `orders`, `order_items`, `customers`,
     `addresses`, `points_ledger`, `subscriptions`, `contact_messages`) → Supabase tables
   - `checkout.ts` / `webhook.ts` / `account.ts` billing-portal → Supabase edge functions
   - customer auth → Supabase Auth; admin auth → a Supabase role / separate table
   - `server/loyalty.ts` rules → a config row or edge-function constant
4. `server/data/*.json` seeds the Supabase `products` data.

## Not in v1

Product reviews, multi-currency, real sales tax, transactional email (order confirmations
and contact replies are stored and shown in the admin only — wire Resend or similar, a
natural fit on Lovable/Supabase), per-page SEO metadata / sitemap.xml.
