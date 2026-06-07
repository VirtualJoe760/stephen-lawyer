import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrderDetail } from "@/lib/orders";
import { formatDate, formatMoney } from "@/lib/utils";

const STEPS = ["paid", "submitted_to_printful", "in_production", "shipped", "delivered"] as const;
const STEP_LABELS: Record<string, string> = {
  paid: "Paid",
  submitted_to_printful: "Submitted",
  in_production: "In production",
  shipped: "Shipped",
  delivered: "Delivered",
};

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  const order = await getOrderDetail(id, session?.user?.id);
  if (!order) notFound();

  const currentStep = STEPS.indexOf(order.status as (typeof STEPS)[number]);

  return (
    <div className="space-y-10">
      <Link href="/account/orders" className="font-mono text-xs uppercase tracking-widest text-ink/60 hover:text-hazard">
        ← All orders
      </Link>

      <header className="grid md:grid-cols-2 gap-6 items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink/60 mb-1">Order</p>
          <h2 className="wordmark text-4xl md:text-5xl">#{order.id.slice(0, 8)}</h2>
          <p className="font-mono text-xs uppercase tracking-widest text-ink/60 mt-2">
            Placed {formatDate(order.createdAt)}
          </p>
        </div>
        {order.trackingUrl && (
          <a
            href={order.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="md:justify-self-end h-12 px-6 inline-flex items-center bg-ink text-bone font-mono text-xs uppercase tracking-widest hover:bg-hazard hover:text-ink"
          >
            Track shipment →
          </a>
        )}
      </header>

      {/* Status track */}
      <ol className="grid grid-cols-5 gap-1">
        {STEPS.map((step, i) => {
          const done = i <= currentStep;
          return (
            <li key={step} className="text-center">
              <div className={`h-1.5 mb-2 ${done ? "bg-hazard" : "bg-ink/15"}`} />
              <p className={`font-mono text-[10px] uppercase tracking-widest ${done ? "" : "text-ink/40"}`}>
                {STEP_LABELS[step]}
              </p>
            </li>
          );
        })}
      </ol>

      <div className="grid md:grid-cols-[1fr_280px] gap-12">
        <section>
          <h3 className="wordmark text-2xl mb-4">Items</h3>
          <ul className="divide-y-2 divide-ink border-y-2 border-ink">
            {order.items.map((item, i) => (
              <li key={i} className="py-4 flex justify-between gap-4">
                <div>
                  <p className="wordmark text-lg">{item.name}</p>
                  <p className="font-mono text-xs uppercase tracking-widest text-ink/60">
                    {item.variant} · qty {item.quantity}
                  </p>
                </div>
                <span className="font-mono">{formatMoney(item.unitPriceCents * item.quantity)}</span>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-6">
          <div>
            <h3 className="wordmark text-2xl mb-3">Ship to</h3>
            <address className="not-italic text-sm leading-relaxed">
              {order.shippingAddress.name && <>{order.shippingAddress.name}<br /></>}
              {order.shippingAddress.line1}<br />
              {order.shippingAddress.line2 && <>{order.shippingAddress.line2}<br /></>}
              {order.shippingAddress.city}, {order.shippingAddress.region} {order.shippingAddress.postalCode}<br />
              {order.shippingAddress.country}
            </address>
          </div>
          <div className="border-t-2 border-ink pt-4 space-y-1 font-mono text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(order.subtotalCents)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{formatMoney(order.shippingCents)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{formatMoney(order.taxCents)}</span></div>
            <div className="flex justify-between border-t-2 border-ink pt-2 mt-2 wordmark text-base">
              <span>Total</span><span>{formatMoney(order.totalCents)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
