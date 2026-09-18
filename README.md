# Aroma Sense — store rebuild

A coded rebuild of the **aromasenseusa.com** Shopify store as a fast React storefront with
its own backend (admin login, orders, Stripe checkout). Built **local-first**; the stack
matches Lovable so it can move there with minimal rework.

Rebrand: the store is **"Aroma Sense"** (no "USA"). **USD only. Ships to the United States
only.** Checkout is Stripe-hosted, which gives **Apple Pay + Google Pay** automatically.

## Stack

- **Frontend** — Vite + React 19 + TypeScript, Tailwind v3 (shadcn-style tokens in
  `src/index.css`), React Router v7, lucide-react. Deploys to **Cloudflare Pages**.
- **Backend** — Express + TypeScript, running on **Cloudflare Workers** (via
  `nodejs_compat` + the `cloudflare:node` Node-compat adapter — the Express app itself is
  unmodified), **Cloudflare D1** (managed SQLite) for the database, Stripe, JWT cookie auth,
  zod.
- Local dev: `npm run dev` runs both — web on **:5177** (Vite), API on **:8787**
  (`wrangler dev`, which emulates Workers + D1 locally via Miniflare — no Cloudflare account
  needed for this part).

Pages (frontend) and the Worker (backend) are always different origins, even locally — see
**Environment** below.

## Run locally

```bash
cd aroma-sense
npm install                                # also applies patches/ (see note below)
cp .dev.vars.example .dev.vars             # edit values (see below)
npm run db:migrate:local                   # create the local D1 schema (one-time)
npm run dev
```

Open http://localhost:5177 · Admin at http://localhost:5177/admin

Other scripts: `npm run build` (typecheck + prod build), `npm run lint`, `npm run scrape`
(re-pull catalog/blog from the live store), `npm run deploy:worker` / `npm run deploy:pages`
(see **Launching**).

> **Why `patches/`?** Express's own top-level code requires `body-parser`, which pulls in
> an old `iconv-lite` that crashes at Worker startup under Cloudflare's current Node compat
> (`require_streams(...) is not a function`) — a real, currently-unfixed gap, not something
> in this app's own code. `patches/iconv-lite+0.4.24.patch` (applied automatically by
> `npm install` via the `postinstall` script) neutralizes the two Node-only extensions
> `iconv-lite` doesn't need for this app (streaming decode, Node primitive extensions);
> everything here only ever handles UTF-8 JSON, so nothing is lost. This app also doesn't
> call `express.json()`/`express.raw()` itself — see `server/bodyParser.ts` — but the patch
> is still required because merely `import express from 'express'` triggers the crash.

## Environment

Cloudflare has two separate mechanisms — don't mix them up:

- **`wrangler.toml`** — non-secret config (`[vars]`), committed. `APP_URL` (your Pages
  domain — used in Stripe redirect/webhook URLs) and `CORS_ORIGIN` (same value — the Worker
  only accepts cross-origin requests+cookies from this origin) live here. Also the `[[d1_databases]]` binding.
- **`.dev.vars`** (local) / `wrangler secret put <NAME>` (deployed) — secrets, never
  committed. `JWT_SECRET`, `ADMIN_PASSWORD`, `STRIPE_SECRET_KEY`,
  `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`.

| var | where | notes |
|---|---|---|
| `APP_URL` | `wrangler.toml` `[vars]` | your Cloudflare Pages URL, e.g. `https://aroma-sense.pages.dev` |
| `CORS_ORIGIN` | `wrangler.toml` `[vars]` | same as `APP_URL` — the Worker rejects cross-origin requests from anywhere else |
| `ADMIN_EMAIL` | `wrangler.toml` `[vars]` | not secret, just the admin login's email |
| `ADMIN_PASSWORD` | `.dev.vars` / secret | seeded into `admin_users` on first request after a fresh migration. Change it afterward from Admin → Settings instead of re-seeding. |
| `JWT_SECRET` | `.dev.vars` / secret | any long random string — signs both the admin and customer session cookies |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` | `.dev.vars` / secret | from Stripe → Developers → API keys. **Test mode** keys start with `sk_test_` / `pk_test_`. The site runs without them, but checkout stays disabled until `STRIPE_SECRET_KEY` is set. |
| `STRIPE_WEBHOOK_SECRET` | `.dev.vars` / secret | from a webhook endpoint pointed at `https://<your-worker>.workers.dev/api/webhooks/stripe` (or your custom domain) |

## Enabling checkout (Stripe)

1. Create a free Stripe account, stay in **Test mode**.
2. Put the test keys in `.dev.vars` (local) or `wrangler secret put STRIPE_SECRET_KEY` etc.
   (deployed), restart.
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
wrangler.toml           Cloudflare Worker config — [vars], the D1 binding, compat flags
migrations/0001_init.sql  D1 schema (apply with `wrangler d1 migrations apply`)
patches/                iconv-lite patch so Express boots under Workers (see "Run locally")
server/
  index.ts              Express app (routes + middleware only — no app.listen here)
  worker.ts             Cloudflare Workers entry point — bridges Workers' fetch events to
                        the Express app via `cloudflare:node`'s httpServerHandler
  bodyParser.ts         minimal JSON/raw-body middleware (avoids Express's own
                        express.json()/raw(), which crash under Workers — see README note)
  db.ts                 D1 binding + one-time seed (admin user, product overrides, welcome
                        discount code) + loads server/data/*.json as static imports
  catalog.ts            merges scraped catalog with admin overrides -> API product shape
  loyalty.ts            Aroma Sense Rewards point rules (earn/redeem rates, sub discount)
  customerAuth.ts       customer session cookie (separate from admin)
  routes/
    public.ts           /api/products, /collections, /blog, /pages, /contact, /config,
                        /discount/validate, /newsletter
    checkout.ts         POST /api/checkout -> Stripe Checkout (payment OR subscription),
                        server-side pricing, points redemption, discount codes, kit
                        discount, Stripe customer reuse
    webhook.ts          /api/webhooks/stripe -> order paid, stock--, award points,
                        redeem discount code, upsert subscriptions
    account.ts          register/login/me + profile, wishlist, orders, addresses, points
                        ledger, subscriptions, Stripe billing-portal session
    admin.ts            login/logout/me/password + /admin/stats, /orders, /products,
                        /customers (+ points adjust), /discount-codes,
                        /newsletter-subscribers, /contact-messages
  data/
    catalog.json        products + variants (prices in cents, USD)
    collections.json    collection membership
    blog.json           140 articles (sanitized HTML bodies, no <img>; each
                        `image` points at /blog-art/<handle>.svg)
    pages.json          hand-written policy pages (shipping/returns/privacy/terms)
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

- See revenue, order count, newsletter signups, unread messages, low-stock list
- View orders, set fulfillment status + tracking number
- Edit any product's price, compare-at price, stock, **Featured** and **Visible** flags —
  changes show on the storefront immediately (stored as overrides; re-scraping keeps them)
- Browse customers — orders, addresses, points ledger — and manually award/deduct points
- Create, disable, and delete discount codes (percent-off, optional max redemptions)
- Read contact-form messages and newsletter signups, mark messages handled
- Change the admin password from Settings (no redeploy needed)

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

Everything runs on Cloudflare: the frontend as a Workers **static-assets** deployment
(`wrangler.pages.toml` — Cloudflare's Pages product now runs on this same mechanism under
the hood, so `*.workers.dev` is the real URL you'll get even though it's still called
"Pages" in the dashboard), the backend as a **Worker** (this Express app via
`nodejs_compat`), **D1** for the database. No separate host, no CORS-across-two-providers
juggling.

> **Gotcha worth knowing**: `wrangler pages deploy dist` (the command Cloudflare's own docs
> lead with) silently ignores `dist/` and redeploys whatever `wrangler.toml`'s `main` field
> points at instead, whenever a `wrangler.toml` for a Worker already exists in the same
> directory (as ours does, for the API). That's why the frontend has its own separate
> `wrangler.pages.toml` (an `[assets]`-only config, no `main`) and is deployed with
> `wrangler deploy -c wrangler.pages.toml` instead — found by actually deploying and getting
> a 404 serving our API's own 404 handler, not by reading the docs.

### 1. Create the D1 database (once)

```bash
npx wrangler login                      # opens a browser to authorize the CLI
npx wrangler d1 create aroma-sense-db
```

Copy the printed `database_id` into `wrangler.toml`'s `[[d1_databases]]` block (replacing
`CHANGE-ME`). Then apply the schema to the real (not local) database:

```bash
npm run db:migrate:remote
```

### 2. Set production secrets

```bash
npx wrangler secret put JWT_SECRET          # a long random string — don't reuse the local one
npx wrangler secret put ADMIN_PASSWORD      # don't reuse aromasense-dev
npx wrangler secret put STRIPE_SECRET_KEY       # once tested in Stripe test mode
npx wrangler secret put STRIPE_PUBLISHABLE_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

And in `wrangler.toml`'s `[vars]` (committed, not secret): set `APP_URL` and `CORS_ORIGIN`
to your real Cloudflare Pages URL (you'll get this in step 4 — come back and fix the
`CHANGE-ME` placeholders, then redeploy the Worker).

### 3. Deploy the Worker (backend)

```bash
npm run deploy:worker
```

Note the `*.workers.dev` URL it prints (or attach a custom route/domain from the Cloudflare
dashboard afterward).

### 4. Deploy the frontend

```bash
npm run deploy:pages
```

This builds with `VITE_API_URL` already pointed at your Worker's URL (edit that env var
inline in the `deploy:pages` script in `package.json` if your Worker's URL differs from the
one currently baked in) and deploys via `wrangler.pages.toml` — see the gotcha above for why
not the more obvious `wrangler pages deploy`. Note the printed URL — this is the
`APP_URL`/`CORS_ORIGIN` value for step 2. Update `wrangler.toml`, `npm run deploy:worker`
again.

### 5. Stripe webhook

Stripe Dashboard → Developers → Webhooks → Add endpoint:
`https://<your-worker>.workers.dev/api/webhooks/stripe`. Copy the signing secret into the
`STRIPE_WEBHOOK_SECRET` secret (step 2), redeploy the Worker.

### Pre-launch checklist

- [ ] Test the full flow in Stripe **test mode** first (checkout, a Subscribe & Save order,
      the customer billing portal) before switching to live keys.
- [ ] Change the admin password from the default (Admin → Settings) if you didn't already
      set a real one via `wrangler secret put`.
- [ ] Replace the placeholder email/phone in [`src/data/site.ts`](src/data/site.ts) (`site.email`,
      `site.phone` — currently marked `TODO`).
- [ ] Decide whether to keep or delete the seeded `WELCOME10` code (Admin → Discounts).
- [ ] `npm run build && npm run lint` clean.
- [ ] Point your own domain at Pages/the Worker if you have one (Cloudflare dashboard —
      Custom domains, on both the Pages project and the Worker).

D1 is Cloudflare's managed, durable SQLite — no separate backup step needed the way a
self-hosted SQLite file would; Cloudflare handles that. `wrangler d1 export aroma-sense-db
--remote --output backup.sql` is still worth running occasionally if you want your own copy.

## Updating, day to day

Most changes don't need a code deploy at all:

- **Prices, stock, visibility, featured flag** → Admin → Products
- **Orders / fulfillment / tracking numbers** → Admin → Orders
- **Discount codes** → Admin → Discounts
- **Customers, manual point adjustments** → Admin → Customers
- **Contact messages, newsletter signups** → Admin → Messages

These take effect immediately, no redeploy needed.

**Code changes** (new pages, design tweaks, new features) — edit locally, `npm run dev` to
check it, then:
- Frontend-only change → `npm run deploy:pages` (or just `git push` if Pages is connected to
  the repo — it redeploys automatically).
- Backend change (anything in `server/`) → `npm run deploy:worker`.

This repo has no git remote yet — `git init`, commit, and push to GitHub whenever you want
Pages' auto-deploy-on-push, or deploy straight from the CLI without GitHub at all.

**Schema changes** (adding a column/table) — add a new file under `migrations/` (never edit
`0001_init.sql` after it's been applied anywhere), then `npm run db:migrate:local` and
`npm run db:migrate:remote`.

**Catalog changes** (new products, changed descriptions on the live Shopify store) — re-run
`npm run scrape`, review the diff in `server/data/*.json`, commit, `npm run deploy:worker`
(the catalog is bundled into the Worker as static JSON, so it needs a redeploy — unlike D1
data, which updates live). Admin overrides (price/stock/visible/featured edits you made in
the admin panel) are preserved across a re-scrape.

## Moving to Lovable

Lovable uses the same frontend stack (Vite + React + TS + Tailwind + shadcn).

1. Create the Lovable project; bring `src/` over (or connect this repo on GitHub).
2. `src/data/site.ts` + `src/index.css` are the content/theme source of truth — hand those
   to Lovable's agent.
3. The backend rebuilds on **Supabase + Stripe edge functions**. The route contract in
   `server/routes/` maps 1:1:
   - all D1 tables (`migrations/0001_init.sql`: `product_overrides`, `orders`,
     `order_items`, `customers`, `addresses`, `points_ledger`, `subscriptions`,
     `wishlist_items`, `discount_codes`, `newsletter_subscribers`, `contact_messages`) →
     Supabase (Postgres) tables
   - `checkout.ts` / `webhook.ts` / `account.ts` billing-portal → Supabase edge functions
   - customer auth → Supabase Auth; admin auth → a Supabase role / separate table
   - `server/loyalty.ts` rules → a config row or edge-function constant
4. `server/data/*.json` seeds the Supabase `products` data.

## Not in v1

Product reviews, multi-currency, real sales tax, transactional email (order confirmations
and contact replies are stored and shown in the admin only — wire Resend or similar, a
natural fit on Lovable/Supabase), per-page SEO metadata / sitemap.xml.
