# Build Prompt — stephenlawyer.com

> Hand this entire document to a coding agent or developer. It is the complete spec for building Stephen Lawyer's e-commerce site end-to-end. Treat every section as authoritative; ask before deviating.

---

## 1. Context

You are building the official direct-to-consumer site for **Stephen Lawyer**, a pro skateboarder based in Encinitas, CA (Sk8 Mafia / Spitfire / Thunder / HUF). The site sells apparel — tees, hoodies, hats, accessories — fulfilled on demand via **Printful**, with payments processed by **Stripe**. There is no held inventory; every order is printed and shipped per-unit by Printful after Stripe captures payment.

**Audience:** core skateboarding fans, ages roughly 14–34. They follow Stephen on Instagram (@stephenlawyer, ~63K), watch his Sk8 Mafia and Thrasher parts, and recognize him for technical ledge skating and an outspoken, expressive personal style (tri-color camo, designer snow goggles, color-saturated fits).

**Positioning:** This is not a corporate athleisure brand. It is **Stephen's voice as merch** — loud, graphic-forward, irreverent, with a DIY/zine sensibility. The site should feel like it was made by a skater, not by a marketing agency. Skaters smell sanitized brand-speak instantly; avoid it.

**Brand name on the site:** `STEPHEN LAWYER` (use as wordmark; all-caps, set tight). No tagline unless one is provided later.

---

## 2. Aesthetic direction

**Visual mood:** loud, expressive, graphic-heavy, DIY zine energy. References to study (not copy):
- **Fucking Awesome** (fuckingawesomestore.com) — the graphic vocabulary and unapologetic edge
- **Hockey** (hockeyskateboards.net) — minimal frame, wild product
- **Bronze 56K** (bronze56k.com) — chaotic-tech, NY internet-coded
- **Limosine** — DIY zine fingerprints
- **Sk8 Mafia**'s own video aesthetic — VHS, raw color

**Type:**
- Headline: a heavy industrial or stencil sans (e.g., **Druk**, **Akzidenz Grotesk Bold Extended**, **Helvetica Now Display Black**, or a free alt like **Inter Display 900** or **Anton**). Set tight, often ALL CAPS, sometimes outlined.
- Body: a clean grotesque (Inter, Neue Haas Grotesk, or system-ui). 16–18px.
- Accent / zine bits: a monospace (JetBrains Mono, IBM Plex Mono) for callouts, prices, SKUs, "edition of N" tags.

**Color:**
- Base palette is **not** muted neutrals. Start from **bone white** (#F4F1EA) and **off-black** (#0F0F0F), then layer aggressive accent colors:
  - Hazard **orange** #FF4A1C
  - Acid **green** #C8FF3F
  - Cobalt **blue** #1F3DFF
  - Hot **pink** #FF2EA0
- Use accents in blocks, not as fills for whole pages. One accent per page section maximum.

**Imagery:**
- Hero photography: action skating shots with motion blur, on-trick stills with grain, candid lifestyle from tours.
- Product photography: high-contrast, sometimes on the body / on the skater, sometimes on textured backdrops (asphalt, painted concrete, security shutters).
- Editorial: use **scan-style** treatments — slight halation, occasional newsprint dot patterns, taped-paper edges. Don't overdo it; one or two zine touches per page, not every element.

**Layout principles:**
- Asymmetric grids. Things deliberately not centered. Type that overlaps photos. Rotated tags ("NEW," "RESTOCK," "1/50").
- Lots of negative space *and* lots of dense moments — alternate, don't blend.
- Sticky elements (cart count, news ticker at the top scrolling drop dates and tour stops) are encouraged.

**What to avoid:**
- Centered hero with subhead + CTA button. Generic SaaS aesthetic.
- Pastel palettes. Sans-serif minimalism without graphic counterweight.
- Stock photography. AI-generated humans in marketing copy.
- Carousel sliders on the homepage (skaters scroll, they don't wait for slides).

---

## 3. Tech stack (required)

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15+ (App Router)** | React Server Components by default; client components only where state demands |
| Language | **TypeScript** strict mode | No `any` in committed code |
| Styling | **Tailwind CSS v4** + a small set of CSS variables for the palette | No CSS-in-JS libs |
| UI primitives | **shadcn/ui** for forms/dialogs/popovers — restyled to match the loud aesthetic | Do not ship default shadcn look |
| Payments | **Stripe Checkout** (hosted) for v1 | Migrate to Stripe Elements later if design control becomes a bottleneck |
| Fulfillment | **Printful API v2** | Catalog sync, mockup generator, order creation, shipping rates, webhooks |
| Database | **Postgres** via **Neon** (serverless) | Drizzle ORM, migrations checked in |
| Auth | **NextAuth (Auth.js v5)** with email magic links + Google OAuth | No password auth |
| CMS (journal) | **Sanity.io** | Free tier is fine; structured content for posts, drops, lookbook entries |
| Image hosting | **Next/Image** + **Cloudflare R2** for editorial uploads; Printful URLs for product mockups | |
| Email | **Resend** | Transactional only — order confirmation, shipping, magic link |
| Analytics | **Plausible** or **Vercel Analytics** | No Google Analytics, no third-party trackers |
| Deployment | **Vercel** | Preview deploys per PR |
| Monitoring | **Sentry** | Errors only; no session replay (privacy-conscious audience) |

**Why Printful for POD:** Best-documented public API among the big three, cleanest pairing with a custom Stripe checkout (you charge in Stripe, then `POST /v2/orders` to Printful on the `checkout.session.completed` webhook). Mockup generator is available. Catalog sync is straightforward. No Shopify dependency.

**Env vars required:**
```
DATABASE_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
PRINTFUL_API_KEY=
PRINTFUL_STORE_ID=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
RESEND_API_KEY=
SANITY_PROJECT_ID=
SANITY_DATASET=
SANITY_API_READ_TOKEN=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=
SENTRY_DSN=
```

---

## 4. Information architecture

```
/                       Home
/shop                   PLP — all products
/shop/[category]        PLP — category (tees, hoodies, hats, accessories)
/product/[slug]         PDP
/lookbook               Lookbook index
/lookbook/[slug]        Individual editorial spread
/journal                Journal index
/journal/[slug]         Journal post
/about                  About / story
/contact                Contact form + FAQ links
/faq                    FAQ (sizing, shipping, returns, custom orders)
/sizing                 Size guide
/shipping-returns       Shipping & returns policy
/privacy                Privacy policy
/terms                  Terms of service
/cart                   Cart drawer route fallback
/account                Account dashboard (requires auth)
/account/orders         Order history
/account/orders/[id]    Order detail + tracking
/account/addresses      Saved addresses
/sign-in                Sign-in (magic link + Google)
/api/stripe/webhook     Stripe webhooks
/api/printful/webhook   Printful webhooks (shipping, fulfillment)
/api/cart/*             Cart mutations
/api/checkout           Create Stripe checkout session
```

Sitemap and robots.txt: include all public pages, exclude `/account/*`, `/api/*`, `/cart`.

---

## 5. Page specifications

### 5.1 Home (`/`)

**Components, top to bottom:**

1. **News ticker bar** (sticky, 32px tall, off-black background, bone-white type, monospace, scrolling horizontally at ~30px/s). Content from a Sanity singleton — items like "NEW DROP FRIDAY 7PM PT · GOING TO BARCELONA NEXT WEEK · FREE SHIPPING OVER $80." Pause on hover.
2. **Header** (sticky after scroll): wordmark left, nav center (`SHOP / LOOKBOOK / JOURNAL / ABOUT`), search + account + cart-count right. Cart count badge in hazard orange.
3. **Hero**: full-bleed action skating photo or short looping silent MP4 (60vh on desktop, 80vh mobile). Overlay an oversized headline ("STEPHEN LAWYER" or current drop name) in the heavy display font, slightly off-center, in bone white with a subtle drop shadow. One small CTA pill bottom-left ("SHOP THE DROP →").
4. **Featured drop strip**: 4-up product grid pulled from the most recent Sanity-tagged "drop". Each card: product image, name, price, hover state reveals a second image.
5. **Lookbook teaser**: two large editorial photos side-by-side with a single line of body copy and a "VIEW LOOKBOOK →" link.
6. **Journal teaser**: latest 3 posts as cards (image + date + title).
7. **Newsletter signup block**: zine-style — paper texture background, monospace caption "Get the drop before it's gone." Email input + "Submit" button. POSTs to `/api/newsletter`.
8. **Footer**: 4-column on desktop (Shop / Help / Stephen / Legal), wordmark + IG/YT/TikTok icons, copyright line.

### 5.2 Shop / PLP (`/shop`, `/shop/[category]`)

- Filter rail (left, sticky) on desktop; drawer on mobile.
  - Filters: Category, Size, Color, Price range, In stock only.
- Sort dropdown (top right): Newest, Price ↑, Price ↓, Best selling.
- Product grid: 3-up desktop, 2-up tablet, 1-up mobile.
- Each card: image (4:5 ratio), hover swaps to alternate image, name, price, color swatches (clickable), small "NEW" or "1/50" badges.
- Pagination: infinite scroll with explicit "Load more" button at the end (no auto-load past 3 pages — preserves history).
- Empty state: "Nothing here yet. Check back after the next drop." with a journal link.

### 5.3 PDP (`/product/[slug]`)

- Gallery (left, 60% width desktop): main image with thumbnail strip below; click to zoom (lightbox).
- Detail (right, 40% width desktop, sticky):
  - Product name (display font, all caps).
  - Price (monospace).
  - Short description (2–3 sentences max).
  - Color swatches (visual squares, selected has bone-white outline).
  - Size selector (outlined squares, S/M/L/XL/XXL; disabled if out of stock per Printful variant).
  - Quantity (default 1, max 10).
  - **ADD TO CART** button — full width, hazard orange bg, off-black type, no border-radius, hover inverts.
  - Below the button: shipping note ("Made on demand. Ships in 3–7 business days from a Printful facility.").
  - Accordion: Materials, Care, Sizing chart (pulls Printful product info), Shipping.
- Below the fold: editorial block with one large lifestyle/on-body photo + a line of copy from Stephen ("Why I made this one").
- "You might also like" — 4 related products by category.

### 5.4 Lookbook (`/lookbook`, `/lookbook/[slug]`)

- Index: vertical scroll of large editorial spreads, two photos per row with title underneath each entry. Each entry links to a full lookbook page.
- Individual page: title, date, intro paragraph, then a long-form layout of mixed photo sizes (asymmetric grid). At the bottom: a "Shop this lookbook" strip linking to tagged products.

### 5.5 Journal (`/journal`, `/journal/[slug]`)

- Index: dated list of posts (newest first), each with thumbnail + title + dek + read time.
- Post: long-form. Sanity Portable Text renderer. Support inline images, pull quotes, embedded YouTube, and a "Shop the post" inline product widget.

### 5.6 About (`/about`)

- Single-column editorial. Big headline. Long-form story (sourced from Sanity, editable). Inset photos. A small "sponsors" footer block listing Stephen's affiliations.

### 5.7 Contact (`/contact`) + FAQ (`/faq`)

- Contact: form with name / email / topic dropdown (Order, Wholesale, Press, Other) / message. POSTs to `/api/contact`, which sends an email via Resend.
- FAQ: accordion list, content from Sanity.

### 5.8 Cart (drawer, available everywhere; `/cart` fallback route)

- Slide-in drawer from right when cart icon is clicked.
- Line items: thumbnail, name, variant (color / size), price, quantity stepper, remove button.
- Subtotal at bottom. Shipping calculated at checkout.
- **CHECKOUT** button — full width, hazard orange, calls `/api/checkout` to create a Stripe Checkout Session and redirects to it.
- Empty state with a "Start shopping →" link.

### 5.9 Account (`/account`)

- Requires auth. Tabs: Orders, Addresses, Profile.
- Orders: list with order #, date, status (paid → in production → shipped → delivered), total. Click into order detail with line items, shipping address, tracking link (from Printful webhook).
- Addresses: CRUD list of saved addresses.
- Profile: name, email (read-only), sign-out.

### 5.10 Sign-in (`/sign-in`)

- Two buttons: "Continue with Google" and "Continue with email" (email shows an input → magic link).
- Below: small line "No password. We'll email you a link."

---

## 6. Data model (Drizzle)

```ts
// /db/schema.ts (sketch — implement fully)
users        (id, email, name, image, created_at)
accounts     (NextAuth)
sessions     (NextAuth)
addresses    (id, user_id, label, line1, line2, city, region, postal_code, country, phone, is_default)
products     (id, printful_sync_product_id, slug, name, description_md, category, is_published, drop_id, created_at)
variants     (id, product_id, printful_sync_variant_id, sku, color, size, retail_price_cents, currency, in_stock, image_url)
drops        (id, name, slug, release_at, is_active)
orders       (id, user_id NULL, stripe_session_id, stripe_payment_intent_id, printful_order_id NULL, status, subtotal_cents, shipping_cents, tax_cents, total_cents, currency, shipping_address_json, created_at, updated_at)
order_items  (id, order_id, variant_id, quantity, unit_price_cents, name_snapshot, variant_snapshot)
newsletter   (id, email, source, created_at)
```

`status` enum: `pending_payment → paid → submitted_to_printful → in_production → shipped → delivered → cancelled → refunded`.

Guest checkout allowed: `orders.user_id` nullable. Email captured at Stripe Checkout and used for confirmation; if the email matches an existing user, link the order to them.

---

## 7. Order flow (end-to-end)

1. User adds variants to cart (client state, persisted to `localStorage` + cookie for SSR hydration).
2. User clicks **CHECKOUT** → `POST /api/checkout` creates a Stripe Checkout Session with line items derived from current cart, collects shipping address, uses **Printful's Shipping Rates API** to compute live shipping options passed to Stripe as `shipping_options`.
3. Stripe redirects to hosted checkout. On success, redirects to `/order/confirmation?session_id=...`.
4. Stripe fires `checkout.session.completed` → `/api/stripe/webhook`:
   - Verify signature.
   - Insert `orders` row with `status=paid`.
   - `POST` to Printful `/v2/orders` with shipping address and recipient info. Use idempotency key = Stripe session ID.
   - Update `orders.printful_order_id`, set `status=submitted_to_printful`.
   - Send confirmation email via Resend.
5. Printful webhooks fire as state changes (`package_shipped`, `order_failed`) → `/api/printful/webhook`:
   - Update `orders.status` and store tracking URL.
   - On `package_shipped`, send shipping email with tracking link.
6. Order detail page polls `/api/orders/[id]` (or uses SWR) to show live status.

**Refunds:** trigger from Stripe Dashboard for v1. Webhook handles `charge.refunded` to set `status=refunded` and email the customer. (Admin UI for refunds is out of scope for v1.)

**Tax:** enable Stripe Tax. Print-on-demand US sales tax is collected by Stripe and remitted per Stripe Tax's setup. International tax handled by Stripe Tax.

**Shipping:** Printful's rates passed through at checkout. Do not flat-rate.

---

## 8. Printful catalog sync

- Build a script `pnpm sync:printful` that pulls all sync products from the store, upserts them into `products` and `variants`, and downloads mockup images to Cloudflare R2 (or stores Printful's CDN URLs directly for v1).
- Run nightly via Vercel Cron (`/api/cron/sync-printful`) AND manually after any catalog change.
- New products default to `is_published=false` so they're not visible until manually flipped.
- Use Sanity to add editorial fields (long description, "why I made this," lookbook tags) keyed by Printful sync product ID. PDP merges Printful structured data with Sanity editorial.

---

## 9. Accessibility & performance

- All interactive elements keyboard-navigable. Focus rings visible (use hazard orange).
- Color contrast ≥ 4.5:1 for body text. The accent palette is loud — verify each combination meets AA.
- Lighthouse targets on production build: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
- LCP < 2.5s on 4G. Use `next/image` everywhere. Preload hero image. No client-side data fetching above the fold.
- All product pages SSG'd with on-demand revalidation when Printful sync runs.
- Bundle: no client JS for static pages. Tree-shake Tailwind aggressively.

---

## 10. SEO

- Per-page `<title>`, `<meta description>`, OG image, Twitter card.
- Product pages emit `Product` structured data (JSON-LD) with offers, availability, brand.
- Journal pages emit `Article` structured data.
- Sitemap auto-generated at build time + on Printful sync.
- Canonical URLs explicit on every page.

---

## 11. Build order (suggested for the implementing agent)

Do not build all at once. Ship incrementally:

1. **Scaffolding & auth** — Next.js project, Tailwind, palette tokens, type setup, NextAuth wired with Google + email magic link, basic layout (header, footer, ticker).
2. **Static pages** — About, Contact, FAQ, Sizing, Shipping/Returns, Privacy, Terms. Sanity wired for editorial. No commerce yet.
3. **Printful catalog sync** — script + DB schema + product/variant pull. Surface raw products at `/shop` as a stub PLP.
4. **PDP** — full product detail page with variant selection and cart-add (cart stays client-side).
5. **PLP** — filters, sort, infinite-scroll, category routing.
6. **Cart drawer** — full UX, persistence.
7. **Checkout** — Stripe session creation, shipping rates from Printful, success/cancel routes.
8. **Order webhooks** — Stripe → order row → Printful order create → confirmation email.
9. **Printful webhooks** — status updates, shipping email.
10. **Account area** — order history, order detail with tracking, addresses.
11. **Journal & Lookbook** — Sanity schemas, list/detail pages, inline product widget.
12. **Home** — final composition with ticker, hero video support, featured drop, teasers.
13. **Polish** — accessibility audit, Lighthouse pass, copy review with Stephen, image optimization.

Each step ends with a working preview deploy and a screenshot/Loom in the PR.

---

## 12. Out of scope for v1

- Wholesale portal
- Multi-currency display (Stripe will charge USD; international shipping supported)
- Loyalty / rewards
- Customer-uploaded designs / custom orders
- Admin dashboard (use Stripe Dashboard, Printful Dashboard, Sanity Studio directly)
- Mobile app
- Affiliate / referral program

Capture these in a `ROADMAP.md` but do not implement.

---

## 13. Acceptance criteria

The site is "done" for v1 when:

1. A new visitor can browse the catalog, add a variant to cart, check out as a guest using a real Stripe test card, receive a confirmation email, and see the order appear in Printful's dashboard as submitted.
2. A returning user signed in with Google can place an order and see it in `/account/orders` with live status.
3. Stephen (or whoever holds the keys) can publish a new journal post in Sanity Studio and see it on the live site within 60 seconds.
4. A new Printful product flipped to `is_published=true` appears on the PLP, has a working PDP, and can be ordered end-to-end.
5. Lighthouse scores meet the targets in section 9 on the deployed site, measured by Vercel's Lighthouse integration.
6. All pages render correctly on iPhone 13 Pro (Safari) and a desktop Chrome at 1440px.

---

## 14. Open questions to confirm with the client before starting

- Confirm the Printful store is created and the API key + store ID can be issued to the build environment.
- Confirm the Stripe account is created, business verification is complete, and Stripe Tax is enabled.
- Confirm Stephen wants Google sign-in (vs. email-only). Default to both.
- Confirm shipping origin (Printful's facility selection — US-first vs. global routing).
- Confirm whether the journal/lookbook content will be seeded by Stephen at launch, or whether we ship with placeholder editorial.
- Confirm the domain (`stephenlawyer.com`? something else?) and DNS access.
- Confirm whether any existing brand or `@fastlove.studio` content should cross-link from this site.

---

*End of build prompt.*
