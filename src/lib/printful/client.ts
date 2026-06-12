const API_BASE = "https://api.printful.com";

export class PrintfulError extends Error {
  constructor(message: string, public readonly status: number, public readonly body?: unknown) {
    super(message);
    this.name = "PrintfulError";
  }
}

interface RequestOpts {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  idempotencyKey?: string;
  query?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const apiKey = process.env.PRINTFUL_API_KEY;
  if (!apiKey) throw new PrintfulError("PRINTFUL_API_KEY not configured", 0);

  const url = new URL(API_BASE + path);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const storeId = process.env.PRINTFUL_STORE_ID;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (storeId) headers["X-PF-Store-Id"] = storeId;
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  const res = await fetch(url.toString(), {
    method: opts.method ?? "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new PrintfulError(`Printful ${res.status}: ${errBody}`, res.status, errBody);
  }

  const json = (await res.json()) as { result: T };
  return json.result;
}

// ---------- Sync products ----------

export interface PrintfulSyncProduct {
  id: number;
  external_id: string;
  name: string;
  variants: number;
  synced: number;
  thumbnail_url: string;
  is_ignored: boolean;
}

export interface PrintfulSyncVariant {
  id: number;
  external_id: string;
  sync_product_id: number;
  name: string;
  synced: boolean;
  variant_id: number;
  retail_price: string;
  currency: string;
  sku: string;
  product: { variant_id: number; product_id: number; image: string; name: string };
  files: { id: number; type: string; url: string; preview_url: string }[];
}

export interface PrintfulSyncProductDetail {
  sync_product: PrintfulSyncProduct;
  sync_variants: PrintfulSyncVariant[];
}

export async function listSyncProducts(limit = 100): Promise<PrintfulSyncProduct[]> {
  return request<PrintfulSyncProduct[]>("/sync/products", { query: { limit } });
}

export async function deleteSyncProduct(id: number | string): Promise<void> {
  await request<unknown>(`/store/products/${id}`, { method: "DELETE" });
}

export async function getSyncProduct(id: number): Promise<PrintfulSyncProductDetail> {
  return request<PrintfulSyncProductDetail>(`/sync/products/${id}`);
}

// ---------- Shipping rates ----------

export interface ShippingRateItem {
  variant_id: number;
  quantity: number;
}

export interface ShippingAddress {
  address1: string;
  city: string;
  country_code: string;
  state_code?: string;
  zip: string;
}

export interface ShippingRate {
  id: string;
  name: string;
  rate: string;
  currency: string;
  minDeliveryDays: number;
  maxDeliveryDays: number;
}

export async function getShippingRates(
  recipient: ShippingAddress,
  items: ShippingRateItem[],
): Promise<ShippingRate[]> {
  return request<ShippingRate[]>("/shipping/rates", {
    method: "POST",
    body: { recipient, items },
  });
}

// ---------- Orders (v2-style under v1 endpoint for compatibility) ----------

export interface PrintfulOrderRecipient {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state_code?: string;
  country_code: string;
  zip: string;
  email?: string;
  phone?: string;
}

export interface PrintfulOrderItem {
  sync_variant_id: number;
  quantity: number;
  retail_price?: string;
  name?: string;
}

export interface PrintfulOrderInput {
  external_id: string;
  recipient: PrintfulOrderRecipient;
  items: PrintfulOrderItem[];
  shipping?: string;
}

export interface PrintfulOrder {
  id: number;
  external_id: string;
  status: string;
  shipping_service_name: string;
  created: number;
  updated: number;
}

export async function createOrder(input: PrintfulOrderInput, idempotencyKey: string): Promise<PrintfulOrder> {
  return request<PrintfulOrder>("/orders", {
    method: "POST",
    body: input,
    idempotencyKey,
    query: { confirm: true },
  });
}

export async function getOrder(id: string | number): Promise<PrintfulOrder> {
  return request<PrintfulOrder>(`/orders/${id}`);
}

// ---------- Sync product creation (admin design generator) ----------

// Design rectangle within a print area, in print-file pixels.
export interface MockupPosition {
  area_width: number;
  area_height: number;
  width: number;
  height: number;
  top: number;
  left: number;
}

export interface CreateSyncProductInput {
  sync_product: { name: string; thumbnail?: string; external_id?: string };
  sync_variants: Array<{
    variant_id: number; // Printful catalog variant id
    retail_price: string; // "29.99"
    files: Array<{ type: string; url: string; position?: MockupPosition }>;
  }>;
}

export async function createSyncProduct(
  input: CreateSyncProductInput,
  idempotencyKey?: string,
): Promise<{ sync_product: { id: number } }> {
  // POST /store/products returns the created sync product. Depending on API
  // version the id is either flat (`result.id`) or nested (`result.sync_product.id`).
  const result = await request<{ id?: number; sync_product?: { id?: number } }>("/store/products", {
    method: "POST",
    body: input,
    idempotencyKey,
  });
  const id = result?.sync_product?.id ?? result?.id ?? 0;
  return { sync_product: { id } };
}

// ---------- Catalog variant lookup (for finalize pricing) ----------

export interface PrintfulCatalogVariant {
  id: number;
  product_id: number;
  name: string;
  size: string;
  color: string;
  color_code: string;
  image: string;
  in_stock: boolean;
  price: string;
}

export async function getCatalogVariant(id: number): Promise<PrintfulCatalogVariant> {
  // GET /products/variant/{id} wraps the variant alongside its product.
  const result = await request<{ variant: PrintfulCatalogVariant }>(`/products/variant/${id}`);
  return result.variant;
}

export interface PrintfulCatalogProduct {
  id: number;
  type: string;
  title: string;
  image: string;
  variant_count: number;
}

export interface ProductPlacements {
  available: Record<string, string>; // placement key -> human label
  allOver: boolean; // true if the product supports all-over (dye-on-fabric) printing
}

// GET /mockup-generator/printfiles/{id} → which print areas a product supports
// (front/back/sleeves/labels/embroidery, and *_dtfabric for all-over).
export async function getProductPlacements(productId: number): Promise<ProductPlacements> {
  const r = await request<{ available_placements?: Record<string, string> }>(
    `/mockup-generator/printfiles/${productId}`,
  );
  const available = r.available_placements ?? {};
  const allOver = Object.keys(available).some((k) => /dtfabric|all[_-]?over/i.test(k));
  return { available, allOver };
}

// ---------- Print areas + mockup generator (placement editor) ----------

export interface PrintAreaPlacement {
  placement: string; // "front", "back", "sleeve_left", ...
  printfileId: number;
  areaWidth: number; // print-file px (the position coordinate space)
  areaHeight: number;
}

// GET /mockup-generator/printfiles/{id} → per-placement print-area dimensions,
// plus a representative variant id to render mockups with.
export async function getProductPrintfiles(
  productId: number,
): Promise<{ variantId: number | null; placements: PrintAreaPlacement[] }> {
  const r = await request<{
    available_placements?: Record<string, string>;
    printfiles?: Array<{ printfile_id: number; width: number; height: number }>;
    variant_printfiles?: Array<{ variant_id: number; placements: Record<string, number> }>;
  }>(`/mockup-generator/printfiles/${productId}`);

  const byId = new Map((r.printfiles ?? []).map((p) => [p.printfile_id, p]));
  const vp = r.variant_printfiles?.[0];
  const placements: PrintAreaPlacement[] = [];
  if (vp) {
    for (const [placement, printfileId] of Object.entries(vp.placements)) {
      const pf = byId.get(printfileId);
      if (pf) placements.push({ placement, printfileId, areaWidth: pf.width, areaHeight: pf.height });
    }
  }
  return { variantId: vp?.variant_id ?? null, placements };
}

export interface MockupFile {
  placement: string;
  image_url: string;
  position?: MockupPosition;
}

// POST /mockup-generator/create-task/{id} → async mockup render task.
export async function createMockupTask(
  productId: number,
  input: { variant_ids: number[]; format?: "jpg" | "png"; files: MockupFile[] },
): Promise<string> {
  const r = await request<{ task_key: string }>(`/mockup-generator/create-task/${productId}`, {
    method: "POST",
    body: { format: "jpg", ...input },
  });
  return r.task_key;
}

export interface MockupTaskResult {
  status: "pending" | "completed" | "failed";
  mockups: Array<{ placement: string; mockup_url: string; variant_ids: number[] }>;
  error?: string;
}

// GET /mockup-generator/task?task_key=... → poll a render task.
export async function getMockupTask(taskKey: string): Promise<MockupTaskResult> {
  const r = await request<{
    status: MockupTaskResult["status"];
    mockups?: MockupTaskResult["mockups"];
    error?: string;
  }>("/mockup-generator/task", { query: { task_key: taskKey } });
  return { status: r.status, mockups: r.mockups ?? [], error: r.error };
}

// Render one or more placements at once → { placement: mockup_url }.
export async function renderMockups(
  productId: number,
  variantId: number,
  files: MockupFile[],
  { attempts = 24, intervalMs = 1500 }: { attempts?: number; intervalMs?: number } = {},
): Promise<Record<string, string>> {
  const key = await createMockupTask(productId, { variant_ids: [variantId], files });
  for (let i = 0; i < attempts; i++) {
    const res = await getMockupTask(key);
    if (res.status === "completed") {
      const out: Record<string, string> = {};
      for (const m of res.mockups) if (m.mockup_url) out[m.placement] = m.mockup_url;
      if (!Object.keys(out).length) throw new Error("Mockup completed but returned no images");
      return out;
    }
    if (res.status === "failed") throw new Error(res.error || "Mockup task failed");
    await new Promise((s) => setTimeout(s, intervalMs));
  }
  throw new Error("Mockup task timed out");
}

// Convenience: create a single-placement mockup and poll until done.
export async function renderMockup(
  productId: number,
  variantId: number,
  file: MockupFile,
  { attempts = 20, intervalMs = 1500 }: { attempts?: number; intervalMs?: number } = {},
): Promise<string> {
  const key = await createMockupTask(productId, { variant_ids: [variantId], files: [file] });
  for (let i = 0; i < attempts; i++) {
    const res = await getMockupTask(key);
    if (res.status === "completed") {
      const url = res.mockups[0]?.mockup_url;
      if (!url) throw new Error("Mockup completed but returned no image");
      return url;
    }
    if (res.status === "failed") throw new Error(res.error || "Mockup task failed");
    await new Promise((s) => setTimeout(s, intervalMs));
  }
  throw new Error("Mockup task timed out");
}

// GET /products/{id} → catalog product + its variants.
export async function getCatalogProduct(
  id: number,
): Promise<{ product: PrintfulCatalogProduct; variants: PrintfulCatalogVariant[] }> {
  return request<{ product: PrintfulCatalogProduct; variants: PrintfulCatalogVariant[] }>(
    `/products/${id}`,
  );
}

// ---------- Full catalog browsing (admin design tool) ----------

export interface PrintfulCatalogListProduct {
  id: number;
  main_category_id: number;
  type: string;
  type_name: string;
  title: string;
  image: string;
  variant_count: number;
  is_discontinued: boolean;
}

export async function listCatalogProducts(): Promise<PrintfulCatalogListProduct[]> {
  return request<PrintfulCatalogListProduct[]>("/products");
}

export interface PrintfulCategory {
  id: number;
  parent_id: number;
  title: string;
}

export async function listCategories(): Promise<PrintfulCategory[]> {
  const r = await request<{ categories: PrintfulCategory[] }>("/categories");
  return r.categories;
}
