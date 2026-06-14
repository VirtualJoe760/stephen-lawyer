# Nanocrew integration — Stephen Lawyer Clothing

This brand is part of the **Nanocrew** ecosystem. Payment and manufacturing are handled by the
Nanocrew platform, not by this site directly — the site is a storefront client.

## Payment (Stripe via Nanocrew POS)
- Checkout posts the cart to the Nanocrew platform API: `POST {NANOCREW_API}/api/public/checkout`
  `{ storeSlug: "stephen-lawyer", items: [{ variantId, quantity }] }` → returns a Stripe Checkout URL.
- The Nanocrew platform creates the Stripe session (prices come from the Nanocrew DB, never the
  client), routes the sale to the brand's **Stripe Connect** account with the platform application
  fee, applies the customer processing fee, and fulfills via Printful on payment.
- This site holds **no Stripe secret key** — all card handling lives in the Nanocrew platform.
- `NANOCREW_API` (a.k.a. brand `apiBase`) = the deployed platform API base.

## Manufacturing (Printful)
- Orders are submitted to Printful by the Nanocrew platform after payment.
- Stephen Lawyer's existing Printful products (sync product IDs already on each variant) are the
  fulfillment source. See the "Printful routing" decision below for which store fulfills.

## Catalog (single source of truth)
- Products + variants + prices live in the **Nanocrew DB** under store `stephen-lawyer`. The site
  reads them from `{NANOCREW_API}/api/public/stores/stephen-lawyer/products`. There is one price
  (`variants.retailPriceCents`) shown everywhere and charged at checkout — no second price to drift.

## Admins / design access
- Owner + collaborator emails are admins for this store and can design products for it from the
  Nanocrew app (Design tab) and edit the site (Studio / brand-site `/admin`).

## Editing this site later
- This repo is registered with the Nanocrew forge pipeline, so site changes can be requested in
  plain words (Studio or `/admin`) → preview → publish. Don't edit production `main` directly.
