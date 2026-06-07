"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/lookbook", label: "Lookbook" },
  { href: "/journal", label: "Journal" },
  { href: "/about", label: "About" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const count = useCart((s) => s.items.reduce((a, b) => a + b.quantity, 0));
  const openCart = useCart((s) => s.open);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-colors duration-150 border-b",
        scrolled
          ? "bg-bone/95 backdrop-blur border-ink-line/20"
          : "bg-bone border-transparent",
      )}
    >
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-6">
        <Link href="/" className="wordmark text-2xl md:text-3xl shrink-0" aria-label="Stephen Lawyer home">
          STEPHEN LAWYER
        </Link>

        <nav className="hidden md:flex items-center gap-8 font-mono text-xs uppercase tracking-widest">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-hazard transition-colors">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4 md:gap-6">
          <Link
            href="/account"
            aria-label="Account"
            className="hidden md:block font-mono text-xs uppercase tracking-widest hover:text-hazard"
          >
            Account
          </Link>
          <button
            type="button"
            onClick={openCart}
            className="relative font-mono text-xs uppercase tracking-widest hover:text-hazard"
            aria-label="Open cart"
          >
            Cart
            {count > 0 && (
              <span className="absolute -top-2 -right-4 bg-hazard text-bone text-[10px] font-mono px-1.5 py-0.5 min-w-[18px] text-center">
                {count}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden font-mono text-xs uppercase tracking-widest"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t border-ink-line/20 bg-bone">
          <ul className="px-4 py-4 flex flex-col gap-3 font-mono text-sm uppercase tracking-widest">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={() => setMobileOpen(false)} className="block py-1">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/account" onClick={() => setMobileOpen(false)} className="block py-1">
                Account
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
