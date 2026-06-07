// Curated list of Printful blanks the designer can drop graphics onto.
// We intentionally do NOT surface Printful's full catalog.
//
// ⚠️ printfulProductId / variantIds MUST be verified against the live Printful
// catalog (GET /products, GET /products/{id}) before publishing (Phase 5).
// IDs below are best-effort and flagged `verified: false`. `mockupUrl` is the
// garment photo fed to Nano Banana for the review composite — fill with the
// product image from the catalog lookup.

export type Placement =
  | "front"
  | "back"
  | "sleeve_left"
  | "sleeve_right"
  | "embroidery_front";

export interface TemplateBlank {
  key: string;
  name: string;
  /** Printful catalog product id. VERIFY before publish. */
  printfulProductId: number | null;
  /** true once confirmed against the live catalog. */
  verified: boolean;
  placements: Placement[];
  defaultPlacement: Placement;
  /** Garment photo used as the Nano Banana composite input. */
  mockupUrl: string;
  /** Printful catalog variant ids to offer on the finalize page. Fill via lookup. */
  variantIds: number[];
}

export const TEMPLATES: TemplateBlank[] = [
  {
    key: "unisex-tee",
    name: "Unisex Tee (Bella+Canvas 3001)",
    printfulProductId: 71, // widely-documented Bella+Canvas 3001 id — confirm
    verified: false,
    placements: ["front", "back"],
    defaultPlacement: "front",
    mockupUrl: "",
    variantIds: [],
  },
  {
    key: "unisex-long-sleeve",
    name: "Unisex Long-Sleeve Tee",
    printfulProductId: null,
    verified: false,
    placements: ["front", "back", "sleeve_left", "sleeve_right"],
    defaultPlacement: "front",
    mockupUrl: "",
    variantIds: [],
  },
  {
    key: "heavy-hoodie",
    name: "Heavy Hoodie (Gildan 18500)",
    printfulProductId: 146, // Gildan 18500 — confirm
    verified: false,
    placements: ["front", "back"],
    defaultPlacement: "front",
    mockupUrl: "",
    variantIds: [],
  },
  {
    key: "crewneck-sweatshirt",
    name: "Crewneck Sweatshirt (Gildan 18000)",
    printfulProductId: 145, // Gildan 18000 — confirm
    verified: false,
    placements: ["front", "back"],
    defaultPlacement: "front",
    mockupUrl: "",
    variantIds: [],
  },
  {
    key: "dad-hat",
    name: "Dad Hat (embroidered)",
    printfulProductId: null,
    verified: false,
    placements: ["embroidery_front"],
    defaultPlacement: "embroidery_front",
    mockupUrl: "",
    variantIds: [],
  },
  {
    key: "beanie",
    name: "Beanie (embroidered)",
    printfulProductId: null,
    verified: false,
    placements: ["embroidery_front"],
    defaultPlacement: "embroidery_front",
    mockupUrl: "",
    variantIds: [],
  },
];

export const TEMPLATE_KEYS = TEMPLATES.map((t) => t.key);

export function getTemplate(key: string): TemplateBlank | undefined {
  return TEMPLATES.find((t) => t.key === key);
}
