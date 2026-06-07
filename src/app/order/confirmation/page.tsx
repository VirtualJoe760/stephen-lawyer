import Link from "next/link";
import type { Metadata } from "next";
import { ClearCartOnMount } from "@/components/clear-cart-on-mount";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false },
};

export default async function OrderConfirmation({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const sp = await searchParams;
  const sessionId = sp.session_id;

  return (
    <div className="px-4 md:px-8 py-24">
      <ClearCartOnMount />
      <div className="max-w-xl mx-auto text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-hazard mb-4">// Confirmed</p>
        <h1 className="wordmark text-6xl md:text-7xl leading-[0.85] mb-6">Thanks.</h1>
        <p className="text-lg leading-relaxed mb-8">
          Your order is in. You'll get a confirmation email shortly, then a shipping notice with tracking once it leaves the facility.
        </p>
        {sessionId && (
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink/60 mb-8 break-all">
            ref: {sessionId.slice(0, 24)}…
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/account/orders"
            className="h-12 px-6 inline-flex items-center justify-center bg-ink text-bone font-mono text-sm uppercase tracking-widest hover:bg-hazard hover:text-ink"
          >
            View order
          </Link>
          <Link
            href="/shop"
            className="h-12 px-6 inline-flex items-center justify-center border-2 border-ink font-mono text-sm uppercase tracking-widest hover:bg-ink hover:text-bone"
          >
            Keep shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
