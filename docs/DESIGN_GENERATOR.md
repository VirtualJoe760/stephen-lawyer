# Design Generator — Functionality Report

A complete analysis of the admin Design Generator: every feature, UI component, API
route, data structure, and external integration. This is the operator tool that turns
AI‑generated (or uploaded) graphics into real, sellable Printful products.

- **Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · Drizzle ORM + Postgres (Neon) · NextAuth v5 · React Flow (`@xyflow/react`) v12
- **External services:** Google Gemini 2.5 Flash Image ("Nano Banana") · Cloudinary · Printful API
- **Entry points:** `/admin/designer` (catalogue picker) → `/admin/designer/[catalogueSlug]` (canvas) → `/admin/compositions/[id]/finalize` (publish)

---

## 1. Concept & mental model

The generator is a **Luma‑style infinite canvas**. The operator works with four kinds of
objects, which become four canvas node types:

| Object | What it is | Becomes node |
|---|---|---|
| **Design** | A square (or aspect‑chosen) graphic — AI‑generated, uploaded, text, or a merge of two designs | `design` node |
| **Blank / Template** | A Printful catalog product (tee, hoodie, etc.) | `template` node |
| **Composition / Composite** | A design placed on a product at chosen placements + sizes, with a real Printful mockup preview | `composition` node |
| **Group** | A draggable container that bundles a design + product + composite | `group` node |

The core loop: **prompt/upload a design → drop it on a blank → choose placement → a Printful
mockup renders → adjust size/position (and add more designs/placements) → finalize & publish
to the storefront.**

Everything lives under a **Catalogue** (e.g. "Summer 2026"), which scopes the designs,
canvas, and compositions.

---

## 2. Access & authentication

- All designer pages and APIs are admin‑gated. Pages call `requireAdminPage()`; API routes
  call `requireAdminRoute()` (returns a 403 `Response` for non‑admins).
- "Admin" = the signed‑in user's email is in the `ADMIN_EMAILS` allowlist (env). NextAuth v5
  with Google + Resend (email) providers.
- The storefront chrome (ticker/header/footer) is hidden on `/admin`; the mobile tab bar
  still renders. The PWA service worker explicitly skips `/api` and `/admin`.

---

## 3. Data model (Postgres / Drizzle)

Tables central to the generator:

### `catalogues`
`id, name, slug, sortOrder, createdAt`. A named collection (the workspace unit).

### `designs`
`id, catalogueId, prompt, cloudinaryPublicId, url, thumbUrl, createdBy, createdAt`.
One row per graphic. `url` is the full Cloudinary image; `thumbUrl` is a 256px square crop.
`prompt` doubles as the label (for generated, the prompt text; for uploads, the filename;
for merges, `"Merge — …"`).

### `compositions`
`id, catalogueId, designId, templateKey, placement, position, placements, previewUrl,
status, printfulSyncProductId, errorMessage, createdAt, updatedAt`.
- `templateKey` = Printful catalog product id (string).
- `placement` / `position` = the **primary** (single) design + its rectangle.
- **`position`** (jsonb): `{ areaWidth, areaHeight, width, height, top, left }` — the design
  rectangle in **print‑file pixels** (the coordinate space Printful uses). `null` = Printful
  auto‑fit.
- **`placements`** (jsonb array): `[{ placement, designId, position }]` — the multi‑design
  source of truth (front + back + sleeves, each its own design). When set, it overrides the
  single `designId/placement/position`.
- `status` enum: `generating → draft → approved → published → failed`.
- `previewUrl` = the current preview image (AI render or, after using the editor, a real
  Printful mockup).

### `canvas_nodes`
`id, catalogueId, kind, refId, groupId, x, y, width, height, scale, zIndex, updatedAt`.
- `kind`: `design | template | composition | label | group`.
- `refId`: the referenced id (designId / productId / compositionId), or text (label/group name).
- `groupId`: members of a group share their group node's id.
- `width/height`: persisted node size (powers group‑box sizing **and** individual node resize).
- Persistence is **replace‑all** per catalogue in one transaction (see `PUT /canvas`).

Migrations `0000`–`0004` cover the above (0002 = `position`, 0003 = `groupId/width/height`,
0004 = `placements`).

---

## 4. The canvas page — layout

`/admin/designer/[catalogueSlug]` server‑loads the catalogue, all catalogues, the saved
canvas nodes, the catalogue's designs, its compositions, and the full Printful blank catalog,
then renders `<DesignerCanvas>` inside a `<ReactFlowProvider>`.

Screen regions (desktop):

```
┌───────────────────────────────────────────────────────────────┐
│ HEADER:  ‹ Admin   [Catalogue ▾]   …designs bar (lg)…   Store ↗ │
├──────────┬──────────────────────────────────────┬──────────────┤
│ Templates│           CANVAS (React Flow)         │  Chat panel  │
│   Rail   │   [toolbar]                [controls] │  (prompt +   │
│ (blanks) │                                       │  upload/text)│
└──────────┴──────────────────────────────────────┴──────────────┘
```

Mobile differs: the designs bar drops to its own full‑width row under the nav; the templates
rail becomes a horizontal dock at the bottom; the chat panel becomes a full‑screen sheet
opened by a floating **Chat** FAB. Root is `h-[100dvh]` with `pb-14` to clear the mobile tab bar.

---

## 5. UI components — exhaustive

### 5.1 Header
- **‹ Admin** — link back to the admin dashboard.
- **CatalogueSwitcher** (`CatalogueSwitcher.tsx`) — a `<select>` of catalogues; choosing one
  navigates to that canvas; the trailing **"+ New / switch…"** option routes to `/admin/designer`.
- **DesignsHistoryBar** (inline on desktop, own row on mobile) — see 5.4.
- **Store ↗** — link to the public storefront.

### 5.2 TemplatesRail (`TemplatesRail.tsx`) — the blank picker
A **3‑level drill‑down** over the full live Printful catalog (493 products), classified
server‑side (`catalog.ts`):
1. **Gender/age tabs:** Men · Women · Kids · Access. (root Printful category → bucket).
2. **Type cards:** product types within that bucket (T‑shirts, Hoodies, Bottoms…), each with a
   representative thumbnail + item count.
3. **Product blanks:** the individual blanks in that type; click adds a `template` node to the
   canvas center.
- A **search box** (vertical mode) filters blanks by name across the whole gender bucket,
  skipping the type level.
- A **breadcrumb** (`‹ men / Hoodies`) returns to the type level.
- Two orientations: `vertical` (desktop left rail) and `horizontal` (mobile bottom dock,
  horizontal scroll only).

### 5.3 ChatPanel (`ChatPanel.tsx`) — design creation
The design‑creation surface. Two variants share logic via the `useChat` hook:
- **`side`** (desktop): description text on top, controls pinned at the bottom.
- **`mobile`**: full‑screen sheet (z above the tab bar) with the input + Generate at the **top**
  so the on‑screen keyboard never covers them; opened by a fixed **Chat** FAB.

Controls:
- **Prompt textarea** — free‑text description. ⌘/Ctrl+Enter submits (desktop).
- **Background toggle** (`BackgroundControls`):
  - **Transparent** (default) — enforces PNG alpha, no backdrop, square.
  - **Background** — generates a full‑frame backdrop and reveals an **aspect‑ratio select**
    (`1:1, 4:5, 3:4, 2:3, 3:2, 16:9, 9:16`).
- **Generate** — calls the design API with `{ prompt, background, aspectRatio }`.
- **↑ Upload** — hidden file input (`image/*`); reads the file to a data URL and uploads it as a
  design (used exactly like a generated one).
- **Aa Text** — opens **TextDialog** (inline; replaced a page‑freezing `window.prompt`): a
  Text field + optional Style field → generates a bold transparent lettering graphic.

Every creation path shows an optimistic **pending tile** in the designs bar, then swaps in the
real design (or drops the tile on failure).

### 5.4 DesignsHistoryBar (`DesignsHistoryBar.tsx`)
Horizontal strip of 48px design thumbnails for the catalogue. Pending designs show an animated
"…" placeholder. **Click a thumbnail → adds that design as a node** on the canvas. Empty state:
"No designs yet — prompt one in chat."

### 5.5 DesignerToolbar (`DesignerToolbar.tsx`) — canvas tools (top‑left overlay)
- **Select / move** (cursor) — default; click/drag nodes.
- **Box‑select** — drag a marquee to multi‑select (sets `selectionOnDrag`; pan moves to
  middle/right‑mouse).
- **Combine** (merge icon) — context‑aware action on the current selection:
  - a **design + a template** → opens the **CombineDialog** (placement → composite).
  - **two designs** → opens the **MergeDialog** (collision prompt → merged design).
  - Enabled (`canCombine`) only when one of those selections is present.

### 5.6 React Flow canvas
- Dark theme, dotted background, zoom controls (`+ / − / fit`), `minZoom 0.2`, `maxZoom 2`,
  `fitView` on load.
- `multiSelectionKeyCode = [Control, Meta]` (Windows/Mac multi‑select); nodes not connectable.
- Node changes (position/remove/dimensions) are **debounced‑persisted** (500ms) via
  `PUT /api/admin/canvas/[slug]`.

### 5.7 Nodes

**DesignNode** (`nodes/DesignNode.tsx`)
- Shows the design thumbnail + truncated prompt; `NodeResizer` when selected; **×** removes it
  from the canvas.
- **Plain click → full‑screen preview** (DesignPreviewModal). Modifier‑click is reserved for
  multi‑select so it doesn't pop the preview.

**TemplateNode** (`nodes/TemplateNode.tsx`)
- Shows the blank image + name; `NodeResizer`; **×** remove.
- **Color picker:** a "Color ▾" row fetches the product's colors
  (`/blank/[id]/colors`) and shows swatches by `color_code`; picking one swaps the node image
  and records `selectedColor`.

**CompositionNode** (`nodes/CompositionNode.tsx`)
- Shows the preview image (or a placeholder); status caption ("draft · tap to open",
  "Rendering…", "Failed"); animated pulse while `generating`; `NodeResizer`; **×** remove.
- **Click → CompositionModal.** On canvas reload, status + preview are hydrated from the DB
  (so failed shows **FAILED**, finished shows the real mockup — not a blank box).

**GroupNode** (`nodes/GroupNode.tsx`)
- A translucent bordered rectangle wrapping its members. The **body is click‑through**
  (`pointer-events-none`) so members stay interactive.
- A **header bar** (above the box) is the only draggable region (`dragHandle: ".group-handle"`):
  drag it to move the whole group. Double‑click the header to **rename**; the **×** ungroups
  (removes the box, keeps the items).

**LabelNode** (`nodes/LabelNode.tsx`)
- Legacy free‑text label (older groups used these). Still rendered for backward compatibility;
  new groups use GroupNode. (Old `+`/`=` separator labels are filtered out on load.)

### 5.8 Dialogs & modals

**CombineDialog** (`CombineDialog.tsx`)
- Opens when a design is dropped on (or selected with) a template. Fetches the product's
  available placements (`/blank/[id]/placements`) and lists them as a grid (front, back,
  sleeves, labels; all‑over options flagged "· all‑over"). Confirm → creates the composite group.

**MergeDialog** (`MergeDialog.tsx`)
- Opens when two designs are combined (or one design is dragged onto another). Shows both
  thumbnails with a "+", and a **"How should they collide?"** prompt. Confirm → merges them into
  a new design.

**TextDialog** (`TextDialog.tsx`)
- Text + optional Style inputs for the "Aa Text" graphic.

**DesignPreviewModal** (`DesignPreviewModal.tsx`)
- Full‑screen preview of a single design with its prompt caption, **Close**, and **Add to canvas**.

**CompositionModal** (`CompositionModal.tsx`)
- Opens from a composite node. Shows the current preview large, plus three actions:
  - **Adjust size & placement** → opens the **PlacementEditor** (only for catalog‑product composites).
  - **Approve & Finalize** → routes to the finalize page.
  - **Discard** → deletes the composition (DELETE) and removes its node.

**AddPlacementDialog** (`AddPlacementDialog.tsx`)
- Opens when a design is **dragged onto an existing composite**. Loads the product's print
  areas and the composite's existing placements, shows the **available** placements as buttons;
  picking one appends that design (centered default box) and re‑renders the combined Printful
  mockup.

**PlacementEditor** (`PlacementEditor.tsx`) — see §7.5 (the centerpiece editor).

---

## 6. Canvas mechanics

- **Adding nodes:** rail click → template; designs‑bar click or preview "Add to canvas" → design.
  New nodes land at the viewport center (`screenToFlowPosition`).
- **Drag‑to‑combine (`onNodeDragStop`):** when a **design** is dropped overlapping another node:
  - over a **template** → CombineDialog (build composite).
  - over another **design** → MergeDialog (merge two designs).
  - over a **composition** → AddPlacementDialog (add a placement/design to that product).
- **Grouping:** `combine()` lays out `[design] [product] [composite]` in a row, tags all three
  with a shared `groupId`, and creates a GroupNode sized to wrap them. Group drag translates all
  members (`onNodeDragStart`/`onNodeDrag`); groups reflow to fit after any drag.
- **Persistence:** `flowNodeToRow`/`rowToFlowNode` map between React Flow nodes and `canvas_nodes`.
  Compositions hydrate status + preview from the DB on load.

---

## 7. Features & workflows (end‑to‑end)

### 7.1 Generate a design
ChatPanel → `POST /api/admin/designs { catalogueId, prompt, background, aspectRatio }` →
`generateDesign()` builds a system prompt (transparent vs filled + aspect ratio) → Gemini
2.5 Flash Image → upload PNG to Cloudinary → insert `designs` row → appears in the bar.

### 7.2 Upload a design
`POST /api/admin/designs/upload { catalogueId, dataUrl, name }` → validates the data URL
(PNG/JPG/WebP/GIF, ≤10MB) → Cloudinary → `designs` row. Used identically to a generated design.

### 7.3 Text graphic
"Aa Text" → builds a lettering prompt (`The words "X" as a bold … {style} … transparent
background`) → same generate pipeline (always transparent).

### 7.4 Merge two designs
`POST /api/admin/designs/merge { designAId, designBId, prompt }` → `mergeDesigns()` feeds both
images + the collision prompt to Gemini → new design (`"Merge — …"`).

### 7.5 Combine → composite, and the Placement Editor (size/position + multi‑design)
1. Combine a design + product (toolbar or drag) → CombineDialog placement → `POST
   /api/admin/compositions` creates the composition (initial AI review render via
   `composeOnGarment`) and a composite node + group.
2. Open the composite → **Adjust size & placement** → **PlacementEditor**:
   - Self‑fetches the composition, the product's **print areas** (`/blank/[id]/printareas` —
     per‑placement pixel dimensions + a render variant), and the catalogue's designs.
   - **Placement chips** — one per assigned placement + **"＋ Add design"** (a two‑step picker:
     choose an available placement, then a design thumbnail). Each chip is removable (down to 1).
   - **Interactive print‑area box** for the active placement: a checkerboard rectangle drawn to
     the real print area; the design sits in a **drag‑to‑move, drag‑corner‑to‑resize** box with
     a **Size slider** (5–100% of the area), **Fill width**, and **Center**. Aspect ratio is
     locked to the design; the box is **hard‑clamped to the print area** so values never exceed
     Printful's accepted bounds.
   - **Generate Printful mockup** → `POST /compositions/[id]/mockup { placements[] }` renders all
     placements in one Printful task and shows the real mockup(s); the front (or first) becomes
     the saved `previewUrl`. Server re‑clamps every position.
   - Some products only return a single mockup view (e.g. a zip hoodie's back) — identical views
     are **deduped** with the note *"This product only previews one view — every placement is
     still printed."*
3. **Multi‑design** is verified against the live Printful API: one product can carry multiple
   placement print files (front + back + sleeves), each its own design + position. Saved in
   `compositions.placements`; sent as separate files at publish.

### 7.6 Full‑screen preview
Click any design node → DesignPreviewModal (image + prompt + Add to canvas).

### 7.7 Groups
See §6. Header‑drag moves the bundle; rename via double‑click; **×** ungroups.

### 7.8 Finalize & publish
CompositionModal → **Approve & Finalize** → `/admin/compositions/[id]/finalize`
(`FinalizeForm.tsx`):
- Loads the product's variants (via `getCatalogProduct`) **grouped by color** (so 100s of
  variants stay usable); shows the preview, **product name**, **markdown description**,
  **placement** select, and a **single retail price** (default ≈ 2× max base cost).
- Select colors → `POST /compositions/[id]/publish`:
  - Builds **one print file per placement** (`comp.placements`, else the single design) using the
    **upscaled raw design PNG** (`upscaleForPrint` → Cloudinary `c_scale` to ~4500px) + the saved
    `position`. The AI composite is **never** sent to Printful.
  - `createSyncProduct` (idempotency key = composition id) → marks the composition `published`,
    mirrors into local `products`/`variants` (`syncPrintfulCatalog`), sets `isPublished` + the
    markdown description → redirects to `/shop`.

### 7.9 Catalogue management
`/admin/designer` (`CatalogueList` + `CatalogueCreate`): list catalogues and create a new one
(`POST /api/admin/catalogues`, slugified, unique).

---

## 8. API routes (admin, all auth‑gated)

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/catalogues` | GET/POST | List / create catalogues |
| `/api/admin/canvas/[catalogueSlug]` | GET/PUT | Load / replace‑all‑save canvas nodes (deduped ids + transaction) |
| `/api/admin/designs` | GET/POST | List designs / generate (Gemini → Cloudinary) with background+aspect |
| `/api/admin/designs/upload` | POST | Upload an image as a design |
| `/api/admin/designs/merge` | POST | Merge two designs via a collision prompt |
| `/api/admin/blank/[id]/colors` | GET | Product color swatches (color + color_code + image) |
| `/api/admin/blank/[id]/placements` | GET | Available print placements + all‑over flag (CombineDialog) |
| `/api/admin/blank/[id]/printareas` | GET | Per‑placement print‑area pixel dimensions + render variant (PlacementEditor) |
| `/api/admin/compositions` | POST | Create a composition (initial AI review render) |
| `/api/admin/compositions/[id]` | GET/PATCH/DELETE | Read (with resolved design images + placements) / set status / delete |
| `/api/admin/compositions/[id]/mockup` | POST | Render real Printful mockup(s) for placements[] + save position(s) |
| `/api/admin/compositions/[id]/publish` | POST | Create the Printful sync product (multi‑placement files) + publish |

---

## 9. External integrations

- **Gemini 2.5 Flash Image** (`lib/gemini.ts`): `generateDesign` (text → graphic, transparent/filled
  + aspect), `mergeDesigns` (two images + prompt), `composeOnGarment` (review render). Retries
  transient empty responses; `friendlyAiError` maps quota/auth/no‑image to readable messages.
  Note: the image model requires a billing‑enabled API key.
- **Cloudinary** (`lib/cloudinary.ts`, server‑only): `uploadImage` (buffer → URL), `thumbUrl`
  (256px square), `upscaledPrintUrl` (`c_scale` ~4500px for print files; the AI upscale add‑on
  `e_upscale` is **not** enabled).
- **Printful** (`lib/printful/client.ts`): full catalog browse (`listCatalogProducts`,
  `listCategories` → `catalog.ts` classification, cached 1h), product/variant lookups, print
  areas + placements, **mockup generator** (`createMockupTask` / `getMockupTask` / `renderMockup` /
  `renderMockups`), and `createSyncProduct`. Auth via `PRINTFUL_API_KEY` + `X-PF-Store-Id`.

---

## 10. Known limitations / notes

- **Mockup vs print file:** the canvas/preview image is a *review* render or a Printful mockup.
  The actual **print file is always the raw design PNG, upscaled** — never the composite.
- **Per‑product mockup views:** some products (e.g. zip‑up hoodie back) only return a single
  mockup view; the print files for all placements are still correct and published.
- **Print upscaling** uses Cloudinary `c_scale` (the AI‑upscale add‑on isn't enabled); swap
  `upscaleForPrint` for Replicate Real‑ESRGAN if higher print fidelity is needed.
- **Aspect‑ratio control** for filled designs is prompt‑guided (Nano Banana), so it's close but
  not pixel‑exact; positions sent to Printful are exact and clamped.
- **Transparency:** AI designs occasionally return an opaque/near‑white background despite the
  transparent setting — a background‑removal step (Cloudinary add‑on or Replicate) is the
  recommended next improvement.
- **Canvas persistence** is replace‑all per catalogue (fine for a single operator).
</content>
