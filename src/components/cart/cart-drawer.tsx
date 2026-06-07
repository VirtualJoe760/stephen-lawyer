"use client";

import Image from "next/image";
import { useCart, selectSubtotal } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { useEffect, useState } from "react";

export function CartDrawer() {
  const isOpen = useCart((s) => s.isOpen);
  const items = useCart((s) => s.items);
  const close = useCart((s) => s.close);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const subtotal = useCart(selectSubtotal);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    if (isOpen) document.addEventListener("keydown", onKey);
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

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
    <>
      <div
        className={`fixed inset-0 z-50 bg-ink/40 transition-opacity ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={close}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-label="Cart"
        aria-modal="true"
        className={`fixed top-0 right-0 z-50 h-screen w-full max-w-md bg-bone border-l-2 border-ink flex flex-col transition-transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between px-6 h-16 border-b-2 border-ink shrink-0">
          <h2 className="wordmark text-2xl">Cart</h2>
          <button onClick={close} className="font-mono text-xs uppercase tracking-widest hover:text-hazard">
            Close
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
            <p className="font-mono text-xs uppercase tracking-widest text-ink/60">Cart is empty</p>
            <a href="/shop" onClick={close} className="underline font-mono text-sm uppercase tracking-widest">
              Start shopping →
            </a>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto divide-y-2 divide-ink">
              {items.map((item) => (
                <li key={item.variantId} className="p-4 flex gap-4">
                  <div className="relative w-20 h-24 bg-bone-200 shrink-0">
                    <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" sizes="80px" />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between gap-2">
                      <h3 className="wordmark text-sm leading-tight">{item.productName}</h3>
                      <span className="font-mono text-sm">{formatMoney(item.unitPriceCents * item.quantity)}</span>
                    </div>
                    <p className="font-mono text-xs uppercase tracking-widest text-ink/60 mt-1">
                      {item.color} · {item.size}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="inline-flex border-2 border-ink">
                        <button
                          type="button"
                          onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                          className="w-7 h-7 hover:bg-ink hover:text-bone"
                          aria-label="Decrease"
                        >
                          −
                        </button>
                        <span className="w-7 h-7 flex items-center justify-center font-mono text-xs">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(item.variantId, item.quantity + 1)}
                          className="w-7 h-7 hover:bg-ink hover:text-bone"
                          aria-label="Increase"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(item.variantId)}
                        className="font-mono text-[10px] uppercase tracking-widest text-ink/60 hover:text-hazard"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="border-t-2 border-ink p-6 shrink-0 space-y-4">
              <div className="flex justify-between font-mono text-sm">
                <span className="uppercase tracking-widest">Subtotal</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/60">
                Shipping + tax at checkout · made on demand
              </p>
              <Button onClick={checkout} disabled={submitting} className="w-full" size="lg">
                {submitting ? "Loading…" : "Checkout"}
              </Button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
