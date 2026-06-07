import Link from "next/link";
import { auth } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/orders";
import { formatDate, formatMoney } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pending",
  paid: "Paid",
  submitted_to_printful: "Submitted",
  in_production: "In production",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export default async function OrdersPage() {
  const session = await auth();
  const orders = session?.user?.id ? await getOrdersForUser(session.user.id) : [];

  if (orders.length === 0) {
    return (
      <div className="border-2 border-dashed border-ink/30 py-20 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-ink/60 mb-3">No orders yet</p>
        <Link href="/shop" className="underline font-mono text-sm uppercase tracking-widest">Start shopping →</Link>
      </div>
    );
  }

  return (
    <ul className="divide-y-2 divide-ink border-y-2 border-ink">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/account/orders/${o.id}`} className="grid grid-cols-2 md:grid-cols-5 gap-4 py-5 hover:bg-bone-200 -mx-2 px-2 transition-colors">
            <div className="font-mono text-xs uppercase tracking-widest">
              <p className="text-ink/60">Order</p>
              <p>#{o.id.slice(0, 8)}</p>
            </div>
            <div className="font-mono text-xs uppercase tracking-widest">
              <p className="text-ink/60">Date</p>
              <p>{formatDate(o.createdAt)}</p>
            </div>
            <div className="font-mono text-xs uppercase tracking-widest">
              <p className="text-ink/60">Status</p>
              <p>{STATUS_LABEL[o.status] ?? o.status}</p>
            </div>
            <div className="font-mono text-xs uppercase tracking-widest">
              <p className="text-ink/60">Items</p>
              <p>{o.itemCount}</p>
            </div>
            <div className="font-mono text-xs uppercase tracking-widest text-right">
              <p className="text-ink/60">Total</p>
              <p>{formatMoney(o.totalCents)}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
