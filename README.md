# stephenlawyer.clothing

Direct-to-consumer e-commerce site for skateboarder Stephen Lawyer. Next.js 15 App Router, TypeScript strict, Tailwind v4. Stripe Checkout for payments, Printful for print-on-demand fulfillment, Postgres (Neon) via Drizzle, NextAuth v5, Sanity for editorial.

## Quick start

```bash
pnpm install
cp .env.example .env.local
# fill in env vars
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Visit http://localhost:3000.

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Local dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript no-emit check |
| `pnpm db:generate` | Generate Drizzle migrations from schema |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm sync:printful` | Pull catalog from Printful into the DB |

## Architecture

- `src/app/*` — App Router routes (server components by default)
- `src/components/*` — UI components, grouped by concern (layout, product, cart, ui)
- `src/lib/*` — Integration clients (Stripe, Printful, Sanity, Resend) and helpers
- `src/db/*` — Drizzle schema and client
- `src/store/*` — Client-side stores (Zustand cart)
- `src/types/*` — Shared TypeScript types
- `scripts/*` — One-off scripts (Printful sync)
- `sanity/schemas/*` — Sanity schema definitions

## Order flow

Cart → `POST /api/checkout` → Stripe Checkout Session (with Printful-derived shipping rates) → user pays → `checkout.session.completed` webhook inserts the order, POSTs to Printful `/v2/orders` (idempotent on Stripe session ID), sends confirmation email via Resend. Printful webhooks update order status as the package progresses.

## Deploying to Vercel

1. Connect the repo.
2. Set all env vars from `.env.example` in Vercel project settings.
3. Add the production domain (`stephenlawyer.clothing`).
4. Configure Stripe webhook to point at `https://stephenlawyer.clothing/api/stripe/webhook`.
5. Configure Printful webhook to point at `https://stephenlawyer.clothing/api/printful/webhook`.
6. Vercel Cron: `0 8 * * *` → `/api/cron/sync-printful` (set `CRON_SECRET`).

## Out of scope for v1

See `ROADMAP.md`.
