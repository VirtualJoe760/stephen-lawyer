import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createOrder } from "@/lib/printful/client";
import { sendOrderConfirmation } from "@/lib/resend";

export const runtime = "nodejs";

interface MetaCartItem {
  v: string;
  p: string;
  n: string;
  c: string;
  s: string;
  q: number;
  pf: number | null;
}

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe webhook] bad signature", err);
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;
      case "charge.refunded":
        await handleRefund(event.data.object as Stripe.Charge);
        break;
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe webhook] handler failed", event.type, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  if (!process.env.DATABASE_URL) {
    console.warn("[stripe webhook] DB not configured; skipping persistence");
    return;
  }

  const cartRaw = session.metadata?.cart;
  if (!cartRaw) return;
  const cart = JSON.parse(cartRaw) as MetaCartItem[];

  const email = session.customer_details?.email ?? session.customer_email ?? "";
  const shipping = session.collected_information?.shipping_details ?? session.shipping_details;

  const subtotal = cart.reduce((acc, i) => acc + (i.q ?? 0) * 1, 0);
  const total = session.amount_total ?? 0;
  const shippingCents = session.shipping_cost?.amount_total ?? 0;
  const taxCents = session.total_details?.amount_tax ?? 0;
  const subtotalCents = total - shippingCents - taxCents;

  // Insert if not already present (webhook may retry).
  const existing = await db.query.orders.findFirst({
    where: eq(orders.stripeSessionId, session.id),
  });
  if (existing) return;

  const [inserted] = await db
    .insert(orders)
    .values({
      email,
      stripeSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
      status: "paid",
      subtotalCents,
      shippingCents,
      taxCents,
      totalCents: total,
      currency: (session.currency ?? "usd").toUpperCase(),
      shippingAddress: shipping?.address ?? {},
    })
    .returning({ id: orders.id });

  if (!inserted) return;

  await db.insert(orderItems).values(
    cart.map((i) => ({
      orderId: inserted.id,
      variantId: null,
      quantity: i.q,
      unitPriceCents: 0,
      nameSnapshot: i.n,
      variantSnapshot: `${i.c} · ${i.s}`,
    })),
  );

  // Submit to Printful (idempotent on Stripe session ID).
  if (process.env.PRINTFUL_API_KEY && shipping?.address) {
    try {
      const pf = await createOrder(
        {
          external_id: session.id,
          recipient: {
            name: shipping.name ?? "",
            address1: shipping.address.line1 ?? "",
            address2: shipping.address.line2 ?? undefined,
            city: shipping.address.city ?? "",
            state_code: shipping.address.state ?? "",
            country_code: shipping.address.country ?? "",
            zip: shipping.address.postal_code ?? "",
            email,
            phone: session.customer_details?.phone ?? undefined,
          },
          items: cart
            .filter((i) => i.pf)
            .map((i) => ({ sync_variant_id: i.pf!, quantity: i.q })),
        },
        session.id,
      );
      await db
        .update(orders)
        .set({ printfulOrderId: String(pf.id), status: "submitted_to_printful" })
        .where(eq(orders.id, inserted.id));
    } catch (err) {
      console.error("[stripe webhook] printful create order failed", err);
    }
  }

  if (email) {
    try {
      await sendOrderConfirmation({
        to: email,
        orderId: inserted.id,
        totalCents: total,
        items: cart.map((i) => ({ name: i.n, variant: `${i.c} · ${i.s}`, quantity: i.q, unitPriceCents: 0 })),
      });
    } catch (err) {
      console.error("[stripe webhook] confirmation email failed", err);
    }
  }
}

async function handleRefund(charge: Stripe.Charge) {
  if (!process.env.DATABASE_URL) return;
  const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
  if (!pi) return;
  await db.update(orders).set({ status: "refunded" }).where(eq(orders.stripePaymentIntentId, pi));
}
