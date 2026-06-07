"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "@/types";

interface CartState {
  items: CartLine[];
  isOpen: boolean;
  add: (line: CartLine) => void;
  remove: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const MAX_QTY = 10;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      add: (line) =>
        set((s) => {
          const existing = s.items.find((i) => i.variantId === line.variantId);
          if (existing) {
            const next = Math.min(MAX_QTY, existing.quantity + line.quantity);
            return {
              items: s.items.map((i) =>
                i.variantId === line.variantId ? { ...i, quantity: next } : i,
              ),
              isOpen: true,
            };
          }
          return { items: [...s.items, { ...line, quantity: Math.min(MAX_QTY, line.quantity) }], isOpen: true };
        }),
      remove: (variantId) => set((s) => ({ items: s.items.filter((i) => i.variantId !== variantId) })),
      setQuantity: (variantId, quantity) =>
        set((s) => ({
          items: s.items
            .map((i) =>
              i.variantId === variantId ? { ...i, quantity: Math.max(0, Math.min(MAX_QTY, quantity)) } : i,
            )
            .filter((i) => i.quantity > 0),
        })),
      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
    }),
    {
      name: "sl-cart-v1",
      partialize: (s) => ({ items: s.items }),
    },
  ),
);

export function selectSubtotal(s: { items: CartLine[] }): number {
  return s.items.reduce((acc, i) => acc + i.unitPriceCents * i.quantity, 0);
}
