# Build Prompt — Admin Design Generator

You are building a new admin-only feature for `stephenlawyer.clothing`: a Luma-Labs-style canvas where the brand operator generates clothing designs with Google's Nano Banana (Gemini 2.5 Flash Image), composites them onto product templates for review, and publishes approved compositions to Printful so they appear automatically on the storefront.

This document is self-contained. Read it end-to-end before starting. Do not invent scope.

---

## 1. Project context

- **Repo root:** `F:\web-clients\stephen-lawyer` (Windows; use absolute Windows paths in all file ops)
- **Stack:** Next.js 15.5.19 (App Router), React 19, TypeScript, Tailwind v4, Drizzle ORM + Postgres (Neon), NextAuth 5 beta, Stripe, Sanity (editorial only), pnpm
- **Production domain:** stephenlawyer.clothing (Vercel)
- **Existing relevant files:**
  - `src/lib/printful/client.ts` — Printful REST wrapper. Read-only today (`listSyncProducts`, `getSyncProduct`, shipping, orders). You will extend it.
  - `src/lib/printful/sync.ts` — `syncPrintfulCatalog()` mirrors Printful sync products → `products` + `variants` tables. Reuse as-is after publishing.
  - `src/db/schema.ts` — has `products.printfulSyncProductId`, `products.isPublished`, and a `drops` table. You will add tables, not modify existing ones.
  - `src/app/api/printful/webhook/` — existing webhook scaffold.
  - `src/lib/auth.ts` — NextAuth config. Currently user-only; no admin role.
- **No admin pages exist yet.** Build a new `/admin/*` route group.

---

## 2. Feature goal

An admin (single brand operator) opens the designer in a browser (mobile or desktop), selects a catalogue (e.g. "Summer 2026"), prompts Nano Banana for a clothing design, drops the design onto a product template node on a pannable canvas, reviews a photo-realistic composite the model renders, then walks through a finalize page that sets price/variants/copy and publishes the product to Printful — which then auto-appears on the public `/shop`.

---

## 3. Architectural decisions (LOCKED — do not relitigate)

1. **Catalogue = collection** (e.g. "Summer 2026", "Fall 2027"). New `catalogues` table. Designs, compositions, and canvas layout are scoped per catalogue. Existing `drops` table stays untouched — a catalogue may eventually have many drops, but drops are out of scope for this build.
2. **The Nano Banana composite is REVIEW-ONLY.** It is a multi-image render of `[template photo] + [design PNG]` for the human's aesthetic judgment. It is NOT the print file. Do not send it to Printful.
3. **The print file is the raw design PNG, upscaled** to Printful's spec (≥150 DPI on the print area; aim for 4500×5400px for tee fronts). Upscaling happens server-side before the Printful POST.
4. **A finalize page** sits between composite approval and Printful submission. The operator sets retail price per variant, placement, product name, description, and selects which template variants (colors/sizes) to publish. Only then is `POST /store/products` called.
5. **Templates are hardcoded.** A curated list of ~6–10 Printful blanks lives in `src/lib/printful/templates.ts`. Do not surface Printful's full catalog. Initial list (you may adjust IDs after looking up current Printful catalog IDs):
   - Unisex tee (Bella+Canvas 3001)
   - Unisex long-sleeve tee
   - Heavy hoodie (Gildan 18500 or Independent SS4500)
   - Crewneck sweatshirt
   - Dad hat (embroidered — note placement differs)
   - Beanie
6. **Canvas:** React Flow (`@xyflow/react`), mobile-first.
7. **Image staging:** Cloudinary, signed uploads from server routes only. Never expose the Cloudinary API secret to the browser.
8. **Image generation:** Gemini 2.5 Flash Image (`gemini-2.5-flash-image`) via `@google/genai`.
9. **Admin auth:** NextAuth session + email allowlist via env var `ADMIN_EMAILS` (comma-separated). All `/admin/*` routes and `/api/admin/*` routes must enforce this.

---

## 4. Database schema additions

Add to `src/db/schema.ts` (additive only — do not modify existing tables). Generate the migration with `pnpm db:generate` after editing.

```ts
export const catalogues = pgTable("catalogues", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),                // "Summer 2026"
  slug: text("slug").notNull().unique(),       // "summer-2026"
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const designs = pgTable("designs", {
  id: uuid("id").defaultRandom().primaryKey(),
  catalogueId: uuid("catalogue_id").notNull().references(() => catalogues.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  cloudinaryPublicId: text("cloudinary_public_id").notNull(),
  url: text("url").notNull(),
  thumbUrl: text("thumb_url").notNull(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (d) => ({
  catalogueIdx: index("designs_catalogue_idx").on(d.catalogueId),
}));

export const compositionStatus = pgEnum("composition_status", [
  "generating",   // Nano Banana call in flight
  "draft",        // composite ready, awaiting designer review
  "approved",     // designer approved, headed to finalize
  "published",    // sent to Printful
  "failed",
]);

export const compositions = pgTable("compositions", {
  id: uuid("id").defaultRandom().primaryKey(),
  catalogueId: uuid("catalogue_id").notNull().references(() => catalogues.id, { onDelete: "cascade" }),
  designId: uuid("design_id").notNull().references(() => designs.id, { onDelete: "cascade" }),
  templateKey: text("template_key").notNull(),       // matches key in templates.ts
  placement: text("placement").notNull().default("front"),
  previewUrl: text("preview_url"),                   // Nano Banana composite (Cloudinary)
  status: compositionStatus("status").notNull().default("generating"),
  printfulSyncProductId: text("printful_sync_product_id"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const canvasNodes = pgTable("canvas_nodes", {
  id: uuid("id").defaultRandom().primaryKey(),
  catalogueId: uuid("catalogue_id").notNull().references(() => catalogues.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),                      // "template" | "design" | "composition"
  refId: text("ref_id").notNull(),                   // designId / compositionId / templateKey
  x: integer("x").notNull().default(0),
  y: integer("y").notNull().default(0),
  scale: integer("scale").notNull().default(100),    // percent
  zIndex: integer("z_index").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});
```

Add relations objects at the bottom of `schema.ts` matching existing style. Export inferred types for `Catalogue`, `Design`, `Composition`, `CanvasNode`.

---

## 5. External services & env vars

Add to `.env.local` and document in `.env.example` (note: `.env.example` was deleted — recreate it):

```
GOOGLE_GENAI_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
ADMIN_EMAILS=joe@example.com,stephen@example.com
PRINTFUL_API_KEY=          # already exists
PRINTFUL_STORE_ID=         # already exists
```

Install:
```
pnpm add @google/genai cloudinary @xyflow/react
```

---

## 6. New file map

```
src/
  lib/
    admin/
      auth.ts                 # isAdmin(session) helper + requireAdmin() guard for routes
    cloudinary.ts             # signed upload helper + URL builders
    gemini.ts                 # generateDesign(prompt) + composeOnGarment(designUrl, templateImgUrl, prompt)
    printful/
      client.ts               # EXTEND: add createSyncProduct(input), getCatalogVariant(id)
      templates.ts            # NEW: curated blanks [{ key, name, printfulProductId, variantIds, mockupUrl, placements }]
      upscale.ts              # NEW: upscaleForPrint(cloudinaryPublicId) → returns print-ready URL
  app/
    admin/
      layout.tsx              # admin shell; calls requireAdmin server-side
      page.tsx                # redirects to /admin/designer
      designer/
        page.tsx              # catalogue picker if none selected
        [catalogueSlug]/
          page.tsx            # canvas shell (server) + DesignerCanvas client component
      compositions/
        [id]/
          finalize/
            page.tsx          # finalize form (variants, prices, copy)
      catalogues/
        page.tsx              # list + create
    api/
      admin/
        catalogues/route.ts                # POST create, GET list
        designs/
          route.ts                          # POST (generate via Gemini), GET list (?catalogueId=)
        compositions/
          route.ts                          # POST (drop event → Nano Banana composite)
          [id]/
            route.ts                        # PATCH (approve/finalize fields), GET
            publish/route.ts                # POST → upscale, createSyncProduct, sync, set isPublished
        canvas/
          [catalogueSlug]/route.ts          # GET/PUT canvas node positions
        cloudinary/sign/route.ts           # POST → returns signed upload params (if any client uploads needed; prefer server-side)
  components/
    admin/
      DesignerCanvas.tsx       # React Flow shell
      TemplatesRail.tsx        # left rail desktop / bottom dock mobile
      DesignsHistoryBar.tsx    # top bar
      ChatPanel.tsx            # right side desktop / bottom sheet mobile
      nodes/
        TemplateNode.tsx
        DesignNode.tsx
        CompositionNode.tsx
      FinalizeForm.tsx
      CatalogueSwitcher.tsx
```

---

## 7. UI specification

### 7.1 Layout — desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────────────┐
│  catalogue switcher │ designs history (h-scroll thumbnails) │ user │
├──────┬───────────────────────────────────────────────────┬─────────┤
│ T E  │                                                    │  Chat  │
│ M    │            React Flow canvas (pan/zoom)            │  panel │
│ P    │                                                    │        │
│ S    │                                                    │ prompt │
│      │                                                    │ input  │
└──────┴───────────────────────────────────────────────────┴─────────┘
```

- Templates rail: vertical scroll, card per blank, color swatch hint.
- Canvas: dotted-grid background, dark, matches Luma reference.
- Chat panel: collapsible to icon. Renders chat history with prompt → thumbnail link to the resulting design node.

### 7.2 Layout — mobile (default; design here first)

```
┌────────────────────────────────────────────┐
│ catalogue ▼   designs ──────────── (h)    │
├────────────────────────────────────────────┤
│                                            │
│    canvas (pinch-zoom, 1-finger pan)       │
│                                            │
├────────────────────────────────────────────┤
│ templates dock ───────────────── (h)       │
├────────────────────────────────────────────┤
│ [💬 chat]  (FAB → opens bottom sheet)      │
└────────────────────────────────────────────┘
```

### 7.3 Interactions

- **Add to canvas:** Tap a template or design from its rail → node spawns at canvas viewport center. Drag-from-rail onto canvas is desktop-only (do not attempt on touch).
- **Combine:** Drag a `DesignNode` so it overlaps a `TemplateNode`. On drop, fire `POST /api/admin/compositions { designId, templateKey, catalogueId }`. Both source nodes remain; a new `CompositionNode` is created at the drop location with status `generating` (skeleton). When the API completes (long-poll or SSE), update the node with `previewUrl`.
- **Node actions** (click/tap a `CompositionNode`):
  - Expand to full-screen viewer (modal with the composite at large size)
  - "Approve & Finalize" → navigates to `/admin/compositions/[id]/finalize`
  - "Discard"
- **Canvas persistence:** Debounce node position updates (500ms) → `PUT /api/admin/canvas/[catalogueSlug]`. Restore on mount.
- **Chat:** Prompt-only (no chat history persisted server-side beyond the resulting design — the chat is a thin UX over `designs` table). Submit → call `POST /api/admin/designs`. Optimistically append a "generating" thumbnail to the history bar.

### 7.4 Finalize page

Form fields:
- Product name (required)
- Description (markdown, optional)
- Template variants checklist: for each color × size offered by the chosen blank, a checkbox + per-variant retail price (defaults to a configurable markup over Printful's base cost — fetch via `/products/variant/{id}`).
- Placement (front/back/sleeve — limited by template's allowed placements)
- Catalogue (locked to current)
- Submit → `POST /api/admin/compositions/[id]/publish`

After publish: redirect to `/shop/[category]` with the new product visible (give it a couple seconds; the sync runs in the publish route).

---

## 8. Backend behavior

### 8.1 `POST /api/admin/designs`

Body: `{ catalogueId, prompt }`.
1. `requireAdmin()`.
2. Call `gemini.generateDesign(prompt)` — system instruction: "Generate a clothing graphic suitable for direct-to-garment printing. Solid or transparent background. High contrast. No text unless explicitly requested. Square aspect ratio."
3. Upload returned PNG to Cloudinary (folder: `stephen-lawyer/designs/{catalogueSlug}`). Generate a 256px thumbnail via Cloudinary transform.
4. Insert into `designs`. Return `{ id, url, thumbUrl, prompt }`.

### 8.2 `POST /api/admin/compositions`

Body: `{ catalogueId, designId, templateKey, placement, x, y }`.
1. `requireAdmin()`.
2. Insert composition with `status: "generating"`. Return the row immediately.
3. Background (await it, but stream/SSE optional): call `gemini.composeOnGarment(design.url, template.mockupUrl, prompt)`. Prompt template: "Place the provided graphic naturally on the {placement} of the {garment type}. Realistic fabric drape, soft studio lighting, neutral background. The graphic must remain clearly readable and not distort."
4. Upload result to Cloudinary (`stephen-lawyer/compositions/{compositionId}`).
5. Update row: `previewUrl`, `status: "draft"`. Return updated row.
6. On error: `status: "failed"`, `errorMessage`.

### 8.3 `POST /api/admin/compositions/[id]/publish`

Body: `{ name, description, variants: [{ printfulVariantId, retailPriceCents }], placement }`.
1. `requireAdmin()`.
2. Upscale the design's PNG: `upscaleForPrint(design.cloudinaryPublicId)` → returns a Cloudinary URL with `e_upscale` or equivalent transformation at the required print resolution.
3. Call Printful: `POST /store/products` via new `createSyncProduct({ sync_product: { name, thumbnail }, sync_variants: [{ variant_id, retail_price, files: [{ type: placement, url: upscaledUrl }] }] })`.
4. Save `printfulSyncProductId` on the composition; set `status: "published"`.
5. Trigger `syncPrintfulCatalog()` to mirror into `products`/`variants`.
6. `UPDATE products SET is_published = true WHERE printful_sync_product_id = ?`.
7. Return success.

### 8.4 Gemini wrapper (`src/lib/gemini.ts`)

```ts
import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY! });
const MODEL = "gemini-2.5-flash-image";

export async function generateDesign(prompt: string): Promise<Buffer> { /* ... */ }
export async function composeOnGarment(
  designUrl: string,
  templateImageUrl: string,
  prompt: string,
): Promise<Buffer> { /* multi-image input */ }
```

Use `responseModalities: ["IMAGE"]` and parse `inlineData` from the response. Both inputs in `composeOnGarment` go in `contents.parts` as `inlineData` (fetch the URLs server-side, base64 them).

### 8.5 Cloudinary wrapper (`src/lib/cloudinary.ts`)

Use the official Node SDK with API secret. Server-side uploads only. Provide:
- `uploadImage(buffer, { folder, publicId })` → returns `{ publicId, url, secureUrl }`
- `thumbUrl(publicId, size = 256)` → URL with `c_fill,w_{size},h_{size}` transformation
- `upscaledPrintUrl(publicId)` → URL with `e_upscale,w_4500` transformation

### 8.6 Printful client extension

Add to `src/lib/printful/client.ts`:

```ts
export interface CreateSyncProductInput {
  sync_product: { name: string; thumbnail?: string };
  sync_variants: Array<{
    variant_id: number;             // Printful catalog variant id
    retail_price: string;           // "29.99"
    files: Array<{ type: string; url: string }>;
  }>;
}
export async function createSyncProduct(input: CreateSyncProductInput): Promise<PrintfulSyncProductDetail> {
  return request("/store/products", { method: "POST", body: input });
}

export interface PrintfulCatalogVariant {
  id: number;
  product_id: number;
  name: string;
  size: string;
  color: string;
  in_stock: boolean;
  price: string;
}
export async function getCatalogVariant(id: number): Promise<PrintfulCatalogVariant> {
  return request(`/products/variant/${id}`);
}
```

---

## 9. Auth gate

In `src/lib/admin/auth.ts`:

```ts
import { auth } from "@/lib/auth";

export async function isAdmin() {
  const session = await auth();
  if (!session?.user?.email) return false;
  const allow = (process.env.ADMIN_EMAILS ?? "").split(",").map(s => s.trim()).filter(Boolean);
  return allow.includes(session.user.email);
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Response("Forbidden", { status: 403 });
}
```

Use in every `/admin/*` page (server component) and every `/api/admin/*` route handler.

---

## 10. Build phases (execute in order)

**Phase 1 — Foundation.** Schema additions + migration. `src/lib/admin/auth.ts`. Env vars wired. `src/lib/printful/templates.ts` populated. `src/lib/gemini.ts`, `src/lib/cloudinary.ts`, Printful client extensions. No UI yet. Ship behind `/admin` returning a placeholder page. Verify: a TypeScript-only test (or temporary route) can call `generateDesign("a red rose")` and upload to Cloudinary.

**Phase 2 — Canvas shell.** `/admin/designer` flow: catalogue list → catalogue create → `[catalogueSlug]/page.tsx` with React Flow mounted, dark dotted grid, templates rail with cards, top bar with empty designs list, chat panel (no Gemini wiring yet). Canvas pan/zoom works on desktop and touch. Tap-template-to-add works. Canvas state persists.

**Phase 3 — Generation.** Wire chat to `POST /api/admin/designs`. New designs appear in top bar. Tap design adds it as `DesignNode` on canvas.

**Phase 4 — Composition.** Drag `DesignNode` onto `TemplateNode` fires `POST /api/admin/compositions`. `CompositionNode` skeleton → updated with composite. Click composition → full-screen modal → "Approve & Finalize" button.

**Phase 5 — Finalize + publish.** Finalize form with variants fetched from Printful. Publish route does upscale → `createSyncProduct` → `syncPrintfulCatalog` → `isPublished = true`. Visit `/shop/[category]` to confirm.

After each phase: `pnpm typecheck` must pass; `pnpm build` must pass.

---

## 11. Constraints & pitfalls

- **Print resolution.** Nano Banana outputs ~1024px. Cloudinary's `e_upscale` to 4500px is the cheapest option; if quality is insufficient, fall back to Replicate's Real-ESRGAN. Either way, upscale before sending to Printful, never before designer review (waste).
- **Transparency.** Prompt Gemini for "transparent background" when generating designs. If output has a background, leave it for now — flag as TODO for a `remove.bg`/`rembg` pass.
- **Printful catalog variant IDs.** The IDs in `templates.ts` must be looked up against the current Printful catalog at build time (`GET /products` then `GET /products/{id}`). Do not guess.
- **Rate limits.** Printful: 120 req/min/store. Gemini image: project quota. Don't burn requests in dev — cache responses where reasonable.
- **Mobile drag.** Do NOT try to make drag-from-rail-to-canvas work on touch. Tap-to-add only. Drag-to-combine (within canvas) is fine on touch — React Flow handles it.
- **Idempotency.** The publish route must be safe to retry. Use the composition id as the Printful external id where applicable.
- **Image bytes in routes.** Don't return Gemini output as base64 to the browser. Upload to Cloudinary server-side, return URLs only.
- **No mocking.** All Printful + Cloudinary calls should hit real services in dev. Use a dev catalogue and clean up via Printful dashboard.

---

## 12. Acceptance criteria

The feature is complete when:

1. An admin (email in `ADMIN_EMAILS`) signs in and reaches `/admin/designer`. Non-admins get 403.
2. They can create a catalogue, switch between catalogues, and the canvas state is preserved per catalogue.
3. They can type a prompt in chat and a new design appears in the top bar within ~15s.
4. They can tap a template and a design from their rails to add them to the canvas.
5. They can drag a `DesignNode` onto a `TemplateNode` and within ~30s see a photo-realistic composite render appear as a `CompositionNode`.
6. They can open the composite full-screen, approve it, fill out the finalize form, and publish.
7. Within a minute of publish, the product appears on the public `/shop/{category}` page with the correct mockup, variants, and pricing.
8. The full flow works on a mobile browser (test on an actual phone, not just devtools): catalogue switch, generate, tap-to-add, drag-to-combine, approve, finalize, publish.
9. `pnpm typecheck` and `pnpm build` pass with zero errors.

---

## 13. Out of scope (do NOT build)

- Multi-admin collaboration / real-time canvas sync
- Edge connectors between nodes (no graph mechanics, just floating cards)
- Editing/regenerating an existing design (only generate new ones)
- Inpainting / mask-based design editing
- Customer-facing design tool
- Drop scheduling, inventory management, analytics
- Removing or migrating any existing schema
- Changes to `/shop`, `/product/[slug]`, checkout, or any storefront page — those should pick up new products automatically via the existing `syncPrintfulCatalog` + `isPublished` flag with no edits

---

When you start, confirm you've read this end-to-end and outline the file changes for Phase 1 before writing code.
