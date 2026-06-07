import { NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { SITE_URL } from "@/lib/utils";

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

export async function POST(req: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured. Set STRIPE_SECRET_KEY to enable checkout." },
        { status: 503 },
      );
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid cart payload" }, { status: 400 });
    }

    const { items } = parsed.data;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "hosted",
      line_items: items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: "usd",
          unit_amount: item.unitPriceCents,
          product_data: {
            name: item.productName,
            description: `${item.color} · ${item.size}`,
            images: item.imageUrl ? [item.imageUrl] : undefined,
            metadata: {
              variantId: item.variantId,
              productSlug: item.productSlug,
              color: item.color,
              size: item.size,
              ...(item.printfulSyncVariantId
                ? { printfulSyncVariantId: String(item.printfulSyncVariantId) }
                : {}),
            },
          },
        },
      })),
      automatic_tax: { enabled: true },
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "MX", "GB", "AU", "DE", "FR", "JP"],
      },
      // Shipping options are populated via the dynamic shipping_options API on the
      // Stripe session once Printful is wired. For v1 we set a fallback flat rate.
      shipping_options: [
        {
          shipping_rate_data: {
            display_name: "Standard",
            type: "fixed_amount",
            fixed_amount: { amount: 600, currency: "usd" },
            delivery_estimate: {
              minimum: { unit: "business_day", value: 3 },
              maximum: { unit: "business_day", value: 7 },
            },
          },
        },
      ],
      phone_number_collection: { enabled: true },
      success_url: `${SITE_URL}/order/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/cart?cancelled=1`,
      metadata: {
        cart: JSON.stringify(
          items.map((i) => ({
            v: i.variantId,
            p: i.productSlug,
            n: i.productName,
            c: i.color,
            s: i.size,
            q: i.quantity,
            pf: i.printfulSyncVariantId ?? null,
          })),
        ),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] error", err);
    return NextResponse.json({ error: "Checkout failed." }, { status: 500 });
  }
}
