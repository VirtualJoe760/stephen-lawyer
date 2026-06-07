"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/product/product-card";
import type { ProductSummary } from "@/types";
import { cn } from "@/lib/utils";

type Sort = "newest" | "price_asc" | "price_desc" | "bestseller";

const SORTS: { value: Sort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
  { value: "bestseller", label: "Best selling" },
];

const SIZES = ["S", "M", "L", "XL", "XXL", "One Size"];
const PAGE_SIZE = 9;

interface Props {
  products: ProductSummary[];
  title: string;
  category?: "tees" | "hoodies" | "hats" | "accessories";
}

export function ShopPage({ products, title, category }: Props) {
  const [sort, setSort] = useState<Sort>("newest");
  const [sizeFilter, setSizeFilter] = useState<Set<string>>(new Set());
  const [colorFilter, setColorFilter] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  const allColors = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.colors.map((c) => c.name)))),
    [products],
  );

  const filtered = useMemo(() => {
    let arr = [...products];
    if (colorFilter.size > 0) arr = arr.filter((p) => p.colors.some((c) => colorFilter.has(c.name)));
    if (sizeFilter.size > 0) {
      // Mock: all our products have all sizes, so this is a no-op until variants are real.
    }
    switch (sort) {
      case "price_asc": arr.sort((a, b) => a.priceCents - b.priceCents); break;
      case "price_desc": arr.sort((a, b) => b.priceCents - a.priceCents); break;
      case "bestseller": arr.reverse(); break;
      default: break;
    }
    return arr;
  }, [products, colorFilter, sizeFilter, sort]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const canLoadMore = visible.length < filtered.length;

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, value: string) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  return (
    <div className="px-4 md:px-8 py-12">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-ink/60 mb-2">
              <Link href="/shop" className="hover:text-hazard">Shop</Link>
              {category && (
                <>
                  {" / "}
                  <span>{title}</span>
                </>
              )}
            </p>
            <h1 className="wordmark text-6xl md:text-8xl">{title}</h1>
          </div>
          <p className="font-mono text-xs uppercase tracking-widest hidden md:block">
            {filtered.length} {filtered.length === 1 ? "item" : "items"}
          </p>
        </header>

        {/* Category tabs */}
        <nav className="flex gap-4 md:gap-6 mb-8 font-mono text-xs uppercase tracking-widest border-b-2 border-ink overflow-x-auto">
          <Link
            href="/shop"
            className={cn("py-3 border-b-2 -mb-[2px]", !category ? "border-hazard text-hazard" : "border-transparent hover:text-hazard")}
          >
            All
          </Link>
          {(["tees", "hoodies", "hats", "accessories"] as const).map((c) => (
            <Link
              key={c}
              href={`/shop/${c}`}
              className={cn(
                "py-3 border-b-2 -mb-[2px] capitalize whitespace-nowrap",
                category === c ? "border-hazard text-hazard" : "border-transparent hover:text-hazard",
              )}
            >
              {c}
            </Link>
          ))}
        </nav>

        <div className="lg:grid lg:grid-cols-[220px_1fr] gap-10">
          {/* Filter rail */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-8 font-mono text-xs uppercase tracking-widest">
              <div>
                <h3 className="mb-3">Size</h3>
                <ul className="flex flex-wrap gap-2">
                  {SIZES.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => toggle(sizeFilter, setSizeFilter, s)}
                        className={cn(
                          "h-9 px-3 border-2",
                          sizeFilter.has(s) ? "border-hazard bg-hazard text-ink" : "border-ink hover:border-hazard",
                        )}
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-3">Color</h3>
                <ul className="space-y-2">
                  {allColors.map((c) => (
                    <li key={c}>
                      <label className="flex items-center gap-2 cursor-pointer normal-case tracking-normal text-sm">
                        <input
                          type="checkbox"
                          checked={colorFilter.has(c)}
                          onChange={() => toggle(colorFilter, setColorFilter, c)}
                          className="accent-hazard"
                        />
                        {c}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>

          {/* Grid */}
          <section>
            <div className="flex items-center justify-between gap-4 mb-6">
              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                className="lg:hidden font-mono text-xs uppercase tracking-widest border-2 border-ink h-9 px-3"
              >
                Filter
              </button>
              <label className="ml-auto flex items-center gap-2 font-mono text-xs uppercase tracking-widest">
                <span className="hidden sm:inline">Sort</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  className="h-9 px-3 border-2 border-ink bg-transparent appearance-none font-mono text-xs uppercase tracking-widest"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {visible.length === 0 ? (
              <div className="py-24 text-center">
                <p className="font-mono text-xs uppercase tracking-widest text-ink/60 mb-3">
                  Nothing here yet.
                </p>
                <p className="text-base mb-6">Check back after the next drop.</p>
                <Link href="/journal" className="underline font-mono text-xs uppercase tracking-widest">
                  Read the journal →
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
                  {visible.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
                {canLoadMore && (
                  <div className="mt-16 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setPage((p) => p + 1)}
                      className="font-mono text-xs uppercase tracking-widest border-2 border-ink h-12 px-8 hover:bg-ink hover:text-bone"
                    >
                      Load more
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filterOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-bone p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="wordmark text-3xl">Filter</h2>
            <button
              onClick={() => setFilterOpen(false)}
              className="font-mono text-xs uppercase tracking-widest"
            >
              Close
            </button>
          </div>
          <div className="space-y-8 font-mono text-xs uppercase tracking-widest">
            <div>
              <h3 className="mb-3">Size</h3>
              <ul className="flex flex-wrap gap-2">
                {SIZES.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => toggle(sizeFilter, setSizeFilter, s)}
                      className={cn(
                        "h-9 px-3 border-2",
                        sizeFilter.has(s) ? "border-hazard bg-hazard text-ink" : "border-ink",
                      )}
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-3">Color</h3>
              <ul className="space-y-2">
                {allColors.map((c) => (
                  <li key={c}>
                    <label className="flex items-center gap-2 normal-case tracking-normal text-sm">
                      <input
                        type="checkbox"
                        checked={colorFilter.has(c)}
                        onChange={() => toggle(colorFilter, setColorFilter, c)}
                        className="accent-hazard"
                      />
                      {c}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
