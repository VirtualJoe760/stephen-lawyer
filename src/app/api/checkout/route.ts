import { NextResponse } from "next/server";
import { z } from "zod";
import { SITE_URL } from "@/lib/utils";

// Checkout runs on the Nanocrew platform now (Stripe Connect + processing fee + Printful
// fulfillment all happen there). This route maps the cart to Nanocrew variant ids by
// (slug, color, size) and forwards to the platform POS, returning the Stripe Checkout URL.
// This site holds no Stripe key — see NANOCREW.md.

const lineSchema = z.object({
  variantId: z.string(),
  productSlug: z.string(),
  productName: z.string(),
  color: z.string(),
  size: z.string(),
  unitPriceCents: z.number().int().positive(),
  imageUrl: z.string().url().optional(),
  quantity: z.number().int().min(1).max(10),
  printfulSyncVariantId: z.number().int().optional(),
});
const bodySchema = z.object({ items: z.array(lineSchema).min(1) });

const API = process.env.NANOCREW_API;
const STORE_SLUG = "stephen-lawyer";

export async function POST(req: Request) {
  try {
    if (!API) {
      return NextResponse.json({ error: "Checkout is not configured." }, { status: 503 });
    }
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid cart payload" }, { status: 400 });
    }
    const { items } = parsed.data;

    // Resolve each cart line to a Nanocrew variant id (the source of truth for price + fulfillment).
    const catRes = await fetch(`${API}/api/public/stores/${STORE_SLUG}/products`, { cache: "no-store" });
    if (!catRes.ok) throw new Error(`catalog ${catRes.status}`);
    const cat = (await catRes.json()) as {
      products: { slug: string; variants: { id: string; color: string | null; size: string | null }[] }[];
    };
    const index = new Map<string, string>();
    for (const p of cat.products) {
      for (const v of p.variants) index.set(`${p.slug}|${v.color ?? ""}|${v.size ?? ""}`, v.id);
    }

    const mapped = items
      .map((i) => ({ variantId: index.get(`${i.productSlug}|${i.color}|${i.size}`), quantity: i.quantity }))
      .filter((x): x is { variantId: string; quantity: number } => Boolean(x.variantId));
    if (!mapped.length) {
      return NextResponse.json({ error: "These items aren't available right now." }, { status: 409 });
    }

    const res = await fetch(`${API}/api/public/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: SITE_URL },
      body: JSON.stringify({ storeSlug: STORE_SLUG, items: mapped }),
    });
    const d = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !d.url) {
      return NextResponse.json({ error: d.error ?? "Checkout failed." }, { status: 502 });
    }
    return NextResponse.json({ url: d.url });
  } catch (err) {
    console.error("[checkout] error", err);
    return NextResponse.json({ error: "Checkout failed." }, { status: 500 });
  }
}
