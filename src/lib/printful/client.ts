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

export interface CreateSyncProductInput {
  sync_product: { name: string; thumbnail?: string };
  sync_variants: Array<{
    variant_id: number; // Printful catalog variant id
    retail_price: string; // "29.99"
    files: Array<{ type: string; url: string }>;
  }>;
}

export async function createSyncProduct(
  input: CreateSyncProductInput,
  idempotencyKey?: string,
): Promise<PrintfulSyncProductDetail> {
  return request<PrintfulSyncProductDetail>("/store/products", {
    method: "POST",
    body: input,
    idempotencyKey,
  });
}

// ---------- Catalog variant lookup (for finalize pricing) ----------

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
  // GET /products/variant/{id} wraps the variant alongside its product.
  const result = await request<{ variant: PrintfulCatalogVariant }>(`/products/variant/${id}`);
  return result.variant;
}
