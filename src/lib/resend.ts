import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

export const resend = apiKey ? new Resend(apiKey) : null;

export const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? "STEPHEN LAWYER <hello@stephenlawyer.com>";

export async function sendOrderConfirmation(opts: {
  to: string;
  orderId: string;
  totalCents: number;
  items: { name: string; variant: string; quantity: number; unitPriceCents: number }[];
}) {
  if (!resend) {
    console.warn("[resend] not configured, skipping confirmation email", opts.orderId);
    return;
  }
  const itemLines = opts.items
    .map((i) => `${i.quantity}× ${i.name} — ${i.variant} ($${(i.unitPriceCents / 100).toFixed(2)})`)
    .join("\n");
  await resend.emails.send({
    from: RESEND_FROM,
    to: opts.to,
    subject: `Order #${opts.orderId.slice(0, 8)} confirmed`,
    text: `Thanks for the order. We're sending it to Printful now — they'll print and ship it from the nearest facility.\n\n${itemLines}\n\nTotal: $${(opts.totalCents / 100).toFixed(2)}\n\n— Stephen`,
  });
}

export async function sendShippingNotification(opts: {
  to: string;
  orderId: string;
  trackingUrl: string;
  trackingNumber?: string;
}) {
  if (!resend) return;
  await resend.emails.send({
    from: RESEND_FROM,
    to: opts.to,
    subject: `Your order has shipped`,
    text: `Order #${opts.orderId.slice(0, 8)} just left the facility.\n\nTrack it: ${opts.trackingUrl}${
      opts.trackingNumber ? `\nTracking #: ${opts.trackingNumber}` : ""
    }\n\n— Stephen`,
  });
}
