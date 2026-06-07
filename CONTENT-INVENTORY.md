# STEPHEN LAWYER — Site Architecture & Content Inventory

> Purpose: a complete map of every route and every piece of content currently on the site, so we can replace all placeholder material with **real Stephen Lawyer** content. No clothing has been designed yet, so the entire product catalog is mock and will be replaced later.
>
> Generated 2026-06-07. Legend: 🚩 = **fabricated "fact" about Stephen Lawyer** (invented, must be verified/replaced) · 🖼 = placeholder image · 📝 = placeholder copy.

---

## 1. How content flows (architecture)

There are **four** content sources today. Knowing which one feeds a surface tells you where to edit it.

| Source | What it feeds | Status |
|---|---|---|
| **`src/lib/mock-products.ts`** | Entire shop: `/shop`, `/shop/[category]`, `/product/[slug]`, homepage "Latest Drop" | Static module, 12 invented products, all images from `picsum.photos`. **No DB / Printful / Sanity in the data path.** |
| **`src/lib/sanity/queries.ts` → `FALLBACK_*` constants** | Journal, Lookbook, News Ticker, FAQ, About bio | **Sanity is NOT configured** (no `SANITY_PROJECT_ID` in env), so the hardcoded `FALLBACK_*` constants are what actually render live. |
| **Hardcoded in page/component files** | Header, footer, homepage hero/newsletter, privacy, terms, shipping-returns, sizing, contact, sign-in, sponsors block | Edit the file directly. |
| **Hardcoded in lib files** | Transactional emails (`resend.ts`, `auth.ts`), contact route | Edit the file directly. |

**Key consequence:** because Sanity is unconfigured, you can replace editorial content **either** by (a) configuring Sanity + entering content, **or** (b) editing the `FALLBACK_*` constants directly. For v1, editing the fallbacks is fastest.

**Database (Neon/Drizzle):** schema exists (11 tables) but holds **no product/content data** — it's for users, orders, addresses, newsletter signups. The catalog does not come from the DB yet.

**Images:** `next.config.ts` already allowlists `images.unsplash.com`, `picsum.photos`, `files.cdn.printful.com`, `cdn.sanity.io`, and `**.r2.cloudflarestorage.com` — so real imagery from any of those will load without config changes. `public/` is **empty** (no logo, favicon, or OG image).

---

## 2. Route map

### Public pages
| Route | File | Content source | Notes |
|---|---|---|---|
| `/` | `src/app/page.tsx` | hardcoded + mock-products + Sanity fallbacks | hero, Latest Drop (4 mock products), lookbook/journal teasers, newsletter |
| `/shop` | `src/app/shop/page.tsx` + `components/shop/shop-page.tsx` | mock-products | all 12 products, filters/sort (size filter is a no-op) |
| `/shop/[category]` | `src/app/shop/[category]/page.tsx` | mock-products | categories: tees, hoodies, hats, accessories |
| `/product/[slug]` | `src/app/product/[slug]/page.tsx` + `components/product/product-detail-view.tsx` | mock-products (SSG) | 12 product pages, JSON-LD always says InStock |
| `/lookbook` | `src/app/lookbook/page.tsx` | Sanity fallback | 2 entries |
| `/lookbook/[slug]` | `src/app/lookbook/[slug]/page.tsx` | Sanity fallback + mock-products | "Shop this lookbook" uses mock products |
| `/journal` | `src/app/journal/page.tsx` | Sanity fallback | 3 posts |
| `/journal/[slug]` | `src/app/journal/[slug]/page.tsx` | Sanity fallback | body is `"Full post coming soon"` placeholder (line 87) |
| `/about` | `src/app/about/page.tsx` | Sanity fallback (bio) + hardcoded (sponsors) | 🚩 heavy fabricated bio |
| `/faq` | `src/app/faq/page.tsx` | Sanity fallback (`FALLBACK_FAQ`) | 4 Q&As |
| `/contact` | `src/app/contact/page.tsx` + `components/contact-form.tsx` | hardcoded | form topics: Order/Wholesale/Press/Other |
| `/sizing` | `src/app/sizing/page.tsx` | hardcoded tables | 🚩 generic measurements |
| `/shipping-returns` | `src/app/shipping-returns/page.tsx` | hardcoded | policy figures to confirm |
| `/privacy` | `src/app/privacy/page.tsx` | hardcoded | names vendors as fact |
| `/terms` | `src/app/terms/page.tsx` | hardcoded | governing law: California |
| `/sign-in` | `src/app/sign-in/page.tsx` | hardcoded | magic-link + Google (not wired yet) |
| `/cart` | `src/app/cart/page.tsx` | client store | — |
| `/order/confirmation` | `src/app/order/confirmation/page.tsx` | — | — |

### Account (auth-gated)
`/account`, `/account/orders`, `/account/orders/[id]`, `/account/addresses` — functional UI, no marketing copy to replace.

### API routes (no public content)
`auth/[...nextauth]`, `cart`, `checkout`, `contact`, `newsletter`, `orders/[id]`, `account/addresses`, `cron/sync-printful`, `printful/webhook`, `stripe/webhook`.

### System pages
`error.tsx`, `loading.tsx`, `not-found.tsx`.

---

## 3. Content inventory by surface

### 3.1 Global chrome

**Metadata** (`src/app/layout.tsx`) 📝
- title default `STEPHEN LAWYER`; template `%s · STEPHEN LAWYER`
- description: `"Direct-to-consumer apparel from pro skateboarder Stephen Lawyer. Tees, hoodies, hats, accessories. Made on demand. Shipped worldwide."`
- OG: type `website`, title `STEPHEN LAWYER`, description `"Direct-to-consumer apparel from pro skateboarder Stephen Lawyer."`, siteName `STEPHEN LAWYER`
- twitter: `summary_large_image` only — **no handle, no title/description**
- **No OG image, no keywords defined**; themeColor `#0F0F0F`
- `SITE_URL` fallback domain (`src/lib/utils.ts:34`): `https://stephenlawyer.clothing`

**Header** (`src/components/layout/header.tsx`)
- Wordmark `STEPHEN LAWYER` → `/`
- Nav: `Shop`, `Lookbook`, `Journal`, `About` · plus `Account`, `Cart`, mobile `Menu/Close`

**Footer** (`src/components/layout/footer.tsx`)
- Columns — Shop: All, Tees, Hoodies, Hats, Accessories · Help: FAQ, Size guide, Shipping & returns, Contact · Stephen: About, Journal, Lookbook · Legal: Privacy, Terms
- 🚩 Socials: `instagram.com/stephenlawyer`, `youtube.com/@stephenlawyer`, `tiktok.com/@stephenlawyer` — **verify these are real accounts**
- 🚩 Copyright: `© {year} Stephen Lawyer. Encinitas, CA.`

**News ticker** (`src/components/layout/news-ticker.tsx` ← `FALLBACK_TICKER`, `queries.ts:3-8`) 🚩
1. `NEW DROP FRIDAY 7PM PT`
2. `FREE SHIPPING OVER $80`
3. `GOING TO BARCELONA NEXT WEEK`
4. `MADE ON DEMAND · SHIPPED FROM PRINTFUL`

### 3.2 Homepage (`src/app/page.tsx`)
- 📝 Announcement: `Summer 26 — out now`
- 📝 Hero headline: `STEPHEN LAWYER` · CTA `Shop the drop →`
- 🖼 Hero image: Unsplash `photo-1517457373958-b7bdd4587205`
- "Latest Drop" = first 4 mock products
- 📝 Lookbook teaser copy: `"Editorial spreads, tour photos, board-snap montages. The visual record of what we're up to between drops."`
- 📝 Newsletter: eyebrow `// signal`, headline `Get the drop` / `Before it's gone`

### 3.3 Shop & product catalog — `src/lib/mock-products.ts` (ALL MOCK)

**12 invented products** (prices USD; all images = `picsum.photos/seed/sl-*`):

| # | Name | Slug | Category | Price | Edition / Badge |
|---|---|---|---|---|---|
| 1 | HAZARD CAMO HOODIE | `hazard-camo-hoodie` | hoodies | $88 | 1/200 · NEW |
| 2 | ENCINITAS SKATE CLUB TEE | `encinitas-skate-club-tee` | tees | $44 | — |
| 3 | OUTLINE WORDMARK TEE | `outline-wordmark-tee` | tees | $42 | NEW |
| 4 | LEDGE LIFE TEE | `ledge-life-tee` | tees | $44 | — |
| 5 | ZINE PULLOVER | `zine-pullover-hoodie` | hoodies | $92 | 1/150 |
| 6 | TOUR STOPS HOODIE | `tour-stops-hoodie` | hoodies | $88 | RESTOCK |
| 7 | STENCIL TRUCKER HAT | `stencil-trucker-hat` | hats | $34 | — |
| 8 | LOW PRO DAD HAT | `low-pro-dad-hat` | hats | $32 | — |
| 9 | WAX POCKET KEYCHAIN | `wax-pocket-keychain` | accessories | $18 | NEW |
| 10 | NEWSPRINT TOTE | `newsprint-tote` | accessories | $28 | — |
| 11 | SK8 MAFIA × SL TEE | `sk8-mafia-x-sl-deck-tee` | tees | $48 | 1/300 · NEW |
| 12 | BONE CARGO SHORTS | `bone-cargo-shorts` | accessories | $68 | — |

🚩 Several names assert fabricated facts/affiliations: **ENCINITAS** Skate Club, **SK8 MAFIA ×** collab, **TOUR STOPS** ("cities I skated this year"), plus first-person "why I made this" quotes attributed to Stephen (e.g. *"The camo I've been printing in my sketchbook since 2019"*, *"Tribute to every busted shin"*). All descriptions, materials, care, sizing notes, editions, and stock are invented.

- **Brand palette** (real, keep): Bone `#F4F1EA`, Ink `#0F0F0F`, Hazard `#FF4A1C`, Acid `#C8FF3F`, Cobalt `#1F3DFF`, Hot Pink `#FF2EA0`
- **PDP boilerplate** 📝: `"Made on demand. Ships in 3–7 business days from a Printful facility."`, editorial heading `"Why I made this one"`, signature `"— Stephen"`, related `"You might also like"`
- **Shop empty state** 📝: `"Nothing here yet."` / `"Check back after the next drop."`
- Size filter is intentionally a no-op until real variants exist; `inStock` is an algorithm (only Ink/XXL ever sells out).

### 3.4 Editorial (Sanity fallbacks) 🚩

**Journal** (`FALLBACK_JOURNAL`, `queries.ts:62-90`) — 3 posts, all 🖼 Unsplash covers, body = `"Full post coming soon"`:
- `Three Months in Encinitas` (2026-05-12)
- `Why the Tri-Color Camo` ("snow gear ate my brain in 2018")
- `Spitfire Tour Recap — Mexico City` (🚩 "Photos by Atiba")

**Lookbook** (`FALLBACK_LOOKBOOK`, `queries.ts:135-161`) — 2 entries, 🖼 Unsplash:
- `Summer 26 / Hazard` ("Shot over four days in Encinitas and downtown LA")
- `Winter 25 / Spitfire` ("On tour with the Spitfire team. Mexico, Spain, the back room at a Madrid skate shop")

**Content model** (Sanity schemas, the structures real content must fill): `post`, `lookbook`, `ticker`, `faq`, `aboutPage`, `productEditorial`.

### 3.5 Static pages

**About** (`src/app/about/page.tsx` + bio fallback `queries.ts:218-235`) 🚩 — **highest priority**
- Bio: *"Pro skater out of Encinitas, California. Sk8 Mafia for life. Spitfire on the wheels, Thunder under the deck, HUF on the feet. Filmed parts since 2014, video parts for Sk8 Mafia, Thrasher, and Spitfire. Known for technical ledge skating and a fit that doesn't apologize."* + a paragraph about funding "the next video, the next trip."
- Sponsors block (hardcoded): Sk8 Mafia, Spitfire, Thunder, HUF (with links)
- 🖼 Unsplash hero photo

**FAQ** (`FALLBACK_FAQ`, `queries.ts:10-35`) — 4 Q&As (shipping times, fit, returns, custom). 🚩 uses `contact@stephenlawyer.clothing`.

**Contact** (`contact/page.tsx` + `contact-form.tsx`) 📝 — intro copy, success `"Got it."`, error references `hello@stephenlawyer.clothing`, topics Order/Wholesale/Press/Other.

**Sizing** (`sizing/page.tsx`) 🚩 — generic placeholder measurement tables for Tees & Hoodies (S–XXL); metadata mentions accessories but no table. Replace with real Printful spec measurements.

**Shipping & returns** (`shipping-returns/page.tsx`) 📝 — production 2–5 days, US 3–7 / intl 7–20, free shipping >$80, 14-day damage-only returns. Confirm all figures.

**Privacy** (`privacy/page.tsx`) 📝 — names Plausible/Vercel/Printful/Stripe/Resend as fact; `privacy@stephenlawyer.clothing`. Confirm before publishing as policy.

**Terms** (`terms/page.tsx`) 📝 — governing law `California, USA`. Confirm jurisdiction/entity.

**Sign in** (`sign-in/page.tsx`) 📝 — magic-link + Google copy; "expires in 24 hours" (confirm vs auth config).

### 3.6 Transactional email copy (`src/lib/resend.ts`, `auth.ts`, `api/contact`)
- From: `STEPHEN LAWYER <hello@stephenlawyer.clothing>`; magic-link from same.
- Order confirmation: subject `Order #{id} confirmed`; body *"Thanks for the order. We're sending it to Printful now…"* signed `— Stephen`.
- Shipping: subject `Your order has shipped`; signed `— Stephen`.

---

## 4. Asset inventory

| Asset | Status |
|---|---|
| Logo / wordmark image | ❌ none (wordmark is text only) |
| Favicon / app icons | ❌ none |
| OG / Twitter share image | ❌ none (no `opengraph-image`, social shares have no image) |
| `public/` directory | ❌ empty |
| Product photography | 🖼 all `picsum.photos` random placeholders |
| Editorial/hero photography | 🖼 all `images.unsplash.com` stock (12 distinct URLs) |
| `temp_images/*.png` | ⚠️ **wrong brand** — these 5 mockups depict a fictional brand **"NORTH GRAIN"** (Scandinavian/euro-priced), not Stephen Lawyer. Unused, inconsistent — ignore or delete. |

---

## 5. Fabricated "facts" — master replacement list (priority)

Everything below is **invented placeholder** and presented as fact on the live site. These came from the original `BUILD_PROMPT.md` brief and need confirmation against the real Stephen Lawyer:

1. **Hometown:** "Encinitas, CA" (footer, about bio, journal/lookbook, metadata)
2. **Sponsors:** Sk8 Mafia, Spitfire, Thunder, HUF (about bio + sponsors block + product names)
3. **Career:** "filmed parts since 2014", "video parts for Sk8 Mafia, Thrasher, and Spitfire", "technical ledge skating"
4. **Trips/events:** Barcelona (ticker), Mexico City tour, Madrid skate shop, "Photos by Atiba"
5. **Social handles:** @stephenlawyer on IG/YT/TT (and "~63K followers" in BUILD_PROMPT)
6. **Journal posts & lookbook entries:** all titles/excerpts/dates
7. **Entire product catalog:** 12 SKUs, prices, editions, copy
8. **Contact email(s):** which mailbox is real — see cross-cutting issue below

---

## 6. Cross-cutting issues to resolve

1. **Inconsistent support email** — pick one canonical address. Currently: `hello@` (most surfaces + email from-address), `contact@` (FAQ fallback only), `privacy@` (privacy page).
2. **`temp_images/` is the wrong brand ("NORTH GRAIN")** — delete or replace so it doesn't confuse future work.
3. **Sanity not configured** — decide: wire up Sanity for editorial, or keep editing `FALLBACK_*` constants for v1.
4. **No OG image / favicon / logo asset** — needed before any real launch/sharing.
5. **Stale brief docs** — `BUILD_PROMPT.md` still says `stephenlawyer.com` (site is `.clothing`) and references a non-existent `.env.example` path in README.
6. **Sizing & policy numbers** are generic — must match real Printful product specs and the real business's policies before publishing privacy/terms/shipping as binding.

---

## 7. What we need from the real Stephen Lawyer (to replace content)

Gathering these unblocks most replacements (much can come from his Instagram, with usage rights confirmed):

- **Bio facts:** real hometown/base, actual sponsors/affiliations, career timeline, notable video parts, skating style — and what he actually wants said publicly.
- **Real social handles** (IG/YT/TT/X) + follower-driven proof links.
- **Photography with usage rights:** portrait/lifestyle shots for hero + about; editorial sets for lookbook; (product photos come later once clothing is designed). ⚠️ Skate photos often belong to the *photographer*, not the skater — confirm rights/credit per image before using on a commercial store.
- **Brand voice/taglines**, real journal stories, real ticker announcements.
- **Business facts** for legal pages: entity, jurisdiction, canonical email, shipping/returns policy, free-shipping threshold.
- **Logo/wordmark art + favicon + OG image** direction.

---

## 8. Replacement checklist

- [ ] About bio + sponsors (`about/page.tsx`, `queries.ts:218`)
- [ ] Footer socials + copyright location (`footer.tsx`)
- [ ] News ticker messages (`queries.ts:3`)
- [ ] Journal posts ×3 + bodies (`queries.ts:62`, `journal/[slug]/page.tsx:87`)
- [ ] Lookbook entries ×2 (`queries.ts:135`)
- [ ] Global metadata description + add OG image + Twitter handle (`layout.tsx`)
- [ ] Homepage hero/announcement/newsletter copy + hero image (`page.tsx`)
- [ ] Canonical support email everywhere (resolve `hello`/`contact`/`privacy`)
- [ ] Sizing tables → real Printful specs (`sizing/page.tsx`)
- [ ] Shipping/privacy/terms figures + jurisdiction (`shipping-returns`, `privacy`, `terms`)
- [ ] Replace all Unsplash/Picsum images with real, rights-cleared photography
- [ ] Add logo, favicon, OG image to `public/` + `src/app`
- [ ] Delete/replace `temp_images/` (wrong brand)
- [ ] (Later) Real product catalog once clothing is designed — repoint `mock-products.ts` consumers
- [ ] Decide Sanity vs. fallback-constants for editorial
