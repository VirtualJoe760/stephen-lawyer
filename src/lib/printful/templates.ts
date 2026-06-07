// Curated list of Printful blanks the designer can drop graphics onto.
// We intentionally do NOT surface Printful's full catalog.
//
// Product IDs, variant IDs, and mockup URLs below were looked up against the
// live Printful catalog (pnpm printful:catalog) for store "Stephen Lawyer
// Clothing" — not guessed. Variants are curated to Black / White / Navy in core
// sizes to keep the finalize form usable; expand as needed.

export type Placement =
  | "front"
  | "back"
  | "sleeve_left"
  | "sleeve_right"
  | "embroidery_front";

export interface TemplateBlank {
  key: string;
  name: string;
  /** Printful catalog product id (verified against live catalog). */
  printfulProductId: number | null;
  verified: boolean;
  placements: Placement[];
  defaultPlacement: Placement;
  /** Garment photo used as the Nano Banana composite input. */
  mockupUrl: string;
  /** Printful catalog variant ids offered on the finalize page. */
  variantIds: number[];
}

export const TEMPLATES: TemplateBlank[] = [
  {
    key: "unisex-tee",
    name: "Unisex Tee (Bella+Canvas 3001)",
    printfulProductId: 71,
    verified: true,
    placements: ["front", "back"],
    defaultPlacement: "front",
    mockupUrl: "https://files.cdn.printful.com/o/upload/product-catalog-img/20/2079a3ee4cc472ad952fe16654f274cd_l",
    variantIds: [4020, 4018, 4017, 4016, 4019, 4115, 4113, 4112, 4111, 4114, 4015, 4013, 4012, 4011, 4014],
  },
  {
    key: "unisex-long-sleeve",
    name: "Unisex Long-Sleeve Tee (Bella+Canvas 3501)",
    printfulProductId: 356,
    verified: true,
    placements: ["front", "back", "sleeve_left", "sleeve_right"],
    defaultPlacement: "front",
    mockupUrl: "https://files.cdn.printful.com/o/upload/product-catalog-img/81/81f6a07c7d89482446ca87dbd1489dd1_l",
    variantIds: [10098, 10096, 10095, 10094, 10097, 10128, 10126, 10125, 10124, 10127, 10146, 10144, 10143, 10142, 10145],
  },
  {
    key: "heavy-hoodie",
    name: "Heavy Hoodie (Gildan 18500)",
    printfulProductId: 146,
    verified: true,
    placements: ["front", "back"],
    defaultPlacement: "front",
    mockupUrl: "https://files.cdn.printful.com/o/upload/product-catalog-img/c6/c650a4604d04de3cedb2694e01920f60_l",
    variantIds: [5534, 5532, 5531, 5530, 5533, 5598, 5596, 5595, 5594, 5597, 5526, 5524, 5523, 5522, 5525],
  },
  {
    key: "crewneck-sweatshirt",
    name: "Crewneck Sweatshirt (Gildan 18000)",
    printfulProductId: 145,
    verified: true,
    placements: ["front", "back"],
    defaultPlacement: "front",
    mockupUrl: "https://files.cdn.printful.com/o/upload/product-catalog-img/c4/c45dccb582df772f84fcafde9b726096_l",
    variantIds: [5438, 5436, 5435, 5434, 5437, 5502, 5500, 5499, 5498, 5501, 5430, 5428, 5427, 5426, 5429],
  },
  {
    key: "dad-hat",
    name: "Dad Hat (Yupoong 6245CM, embroidered)",
    printfulProductId: 206,
    verified: true,
    placements: ["embroidery_front"],
    defaultPlacement: "embroidery_front",
    mockupUrl: "https://files.cdn.printful.com/o/products/206/product_1584101692.jpg",
    variantIds: [7854, 7857, 7853],
  },
  {
    key: "beanie",
    name: "Beanie (Atlantis ribbed, embroidered)",
    printfulProductId: 519,
    verified: true,
    placements: ["embroidery_front"],
    defaultPlacement: "embroidery_front",
    mockupUrl: "https://files.cdn.printful.com/o/upload/product-catalog-img/c4/c402cbb2c375e9ba922a14855a05cb19_l",
    variantIds: [13238, 13241],
  },
];

export const TEMPLATE_KEYS = TEMPLATES.map((t) => t.key);

export function getTemplate(key: string): TemplateBlank | undefined {
  return TEMPLATES.find((t) => t.key === key);
}
