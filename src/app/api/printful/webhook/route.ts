import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendShippingNotification } from "@/lib/resend";

interface PrintfulWebhookPayload {
  type: string;
  data: {
    order?: { id: number; external_id: string };
    shipment?: { tracking_number?: string; tracking_url?: string };
  };
}

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  // Printful supports HMAC verification via webhook secret since 2024.
  // When configured, validate the X-PF-Signature header. Stub for v1.
  const payload = (await req.json()) as PrintfulWebhookPayload;

  const externalId = payload.data.order?.external_id;
  if (!externalId) return NextResponse.json({ ignored: true });

  const order = await db.query.orders.findFirst({
    where: eq(orders.stripeSessionId, externalId),
    columns: { id: true, email: true },
  });
  if (!order) return NextResponse.json({ ignored: true });

  switch (payload.type) {
    case "package_shipped": {
      const trackingUrl = payload.data.shipment?.tracking_url ?? null;
      const trackingNumber = payload.data.shipment?.tracking_number ?? null;
      await db
        .update(orders)
        .set({ status: "shipped", trackingUrl, trackingNumber })
        .where(eq(orders.id, order.id));
      if (order.email && trackingUrl) {
        await sendShippingNotification({
          to: order.email,
          orderId: order.id,
          trackingUrl,
          trackingNumber: trackingNumber ?? undefined,
        });
      }
      break;
    }
    case "package_returned":
    case "order_failed":
      await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, order.id));
      break;
    case "order_put_hold":
    case "order_remove_hold":
      // No state change; could log if needed.
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
