"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface AccordionItem {
  id: string;
  title: string;
  body: React.ReactNode;
}

export function Accordion({ items, defaultOpen }: { items: AccordionItem[]; defaultOpen?: string }) {
  const [open, setOpen] = useState<string | null>(defaultOpen ?? null);
  return (
    <div className="divide-y-2 divide-ink border-y-2 border-ink">
      {items.map((item) => {
        const isOpen = open === item.id;
        return (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : item.id)}
              className="w-full py-4 flex items-center justify-between gap-4 font-mono text-xs uppercase tracking-widest"
              aria-expanded={isOpen}
            >
              <span>{item.title}</span>
              <span aria-hidden className={cn("transition-transform", isOpen && "rotate-45")}>+</span>
            </button>
            {isOpen && <div className="pb-6 text-sm leading-relaxed">{item.body}</div>}
          </div>
        );
      })}
    </div>
  );
}
