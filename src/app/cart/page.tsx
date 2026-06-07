"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart, selectSubtotal } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

export default function CartPage() {
  const items = useCart((s) => s.items);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const subtotal = useCart(selectSubtotal);
  const [submitting, setSubmitting] = useState(false);

  const checkout = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? "Checkout failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 md:px-8 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="wordmark text-6xl md:text-8xl mb-10">Cart</h1>
        {items.length === 0 ? (
          <div className="border-2 border-dashed border-ink/30 py-20 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-ink/60 mb-3">Empty</p>
            <Link href="/shop" className="underline font-mono text-sm uppercase tracking-widest">
              Start shopping →
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_320px] gap-12">
            <ul className="divide-y-2 divide-ink border-y-2 border-ink">
              {items.map((item) => (
                <li key={item.variantId} className="py-6 grid grid-cols-[100px_1fr] gap-4 items-start">
                  <div className="relative aspect-[4/5] bg-bone-200">
                    <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" sizes="100px" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between gap-4">
                      <Link href={`/product/${item.productSlug}`} className="wordmark text-xl hover:text-hazard">
                        {item.productName}
                      </Link>
                      <span className="font-mono">{formatMoney(item.unitPriceCents * item.quantity)}</span>
                    </div>
                    <p className="font-mono text-xs uppercase tracking-widest text-ink/60">
                      {item.color} · {item.size}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="inline-flex border-2 border-ink">
                        <button onClick={() => setQuantity(item.variantId, item.quantity - 1)} className="w-7 h-7 hover:bg-ink hover:text-bone">−</button>
                        <span className="w-8 h-7 flex items-center justify-center font-mono text-xs">{item.quantity}</span>
                        <button onClick={() => setQuantity(item.variantId, item.quantity + 1)} className="w-7 h-7 hover:bg-ink hover:text-bone">+</button>
                      </div>
                      <button onClick={() => remove(item.variantId)} className="font-mono text-xs uppercase tracking-widest text-ink/60 hover:text-hazard">
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <aside className="space-y-4 self-start lg:sticky lg:top-24 border-2 border-ink p-6">
              <div className="flex justify-between font-mono">
                <span className="uppercase tracking-widest text-sm">Subtotal</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/60">
                Shipping + tax calculated at checkout
              </p>
              <Button onClick={checkout} disabled={submitting} className="w-full" size="lg">
                {submitting ? "Loading…" : "Checkout"}
              </Button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
