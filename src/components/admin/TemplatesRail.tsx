"use client";
import { useMemo, useState } from "react";
import type { CatalogBlank, BlankCategory } from "@/lib/printful/catalog";

const GENDERS: { key: BlankCategory; label: string }[] = [
  { key: "men", label: "Men" },
  { key: "women", label: "Women" },
  { key: "kids", label: "Kids" },
  { key: "accessories", label: "Access." },
];

export function TemplatesRail({
  blanks,
  onAdd,
  orientation = "vertical",
}: {
  blanks: CatalogBlank[];
  onAdd: (b: CatalogBlank) => void;
  orientation?: "vertical" | "horizontal";
}) {
  const [gender, setGender] = useState<BlankCategory>("men");
  const [type, setType] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const horizontal = orientation === "horizontal";

  const inGender = useMemo(() => blanks.filter((b) => b.category === gender), [blanks, gender]);

  // Types within the chosen gender, each with a representative thumbnail + count.
  const types = useMemo(() => {
    const m = new Map<string, { type: string; image: string; count: number }>();
    for (const b of inGender) {
      const e = m.get(b.type);
      if (e) e.count++;
      else m.set(b.type, { type: b.type, image: b.image, count: 1 });
    }
    return [...m.values()].sort((a, b) => a.type.localeCompare(b.type));
  }, [inGender]);

  const needle = q.trim().toLowerCase();
  const products = useMemo(() => {
    if (needle) return inGender.filter((b) => b.name.toLowerCase().includes(needle));
    if (type) return inGender.filter((b) => b.type === type);
    return [];
  }, [inGender, type, needle]);

  const showProducts = Boolean(needle || type);
  const cardCls = `shrink-0 rounded-md border border-bone/15 bg-ink-soft p-2 text-left transition-colors hover:border-hazard ${
    horizontal ? "w-28" : "w-full"
  }`;
  const grid = horizontal ? "flex gap-2 overflow-x-auto pb-1" : "flex flex-col gap-2 overflow-y-auto";

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {/* Level 1: gender / age */}
      <div className="flex flex-wrap gap-1">
        {GENDERS.map((g) => (
          <button
            key={g.key}
            onClick={() => {
              setGender(g.key);
              setType(null);
            }}
            className={`rounded px-2 py-1 text-[10px] font-mono uppercase tracking-wide ${
              gender === g.key ? "bg-hazard text-bone" : "bg-bone/5 text-bone/60 hover:text-bone"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {!horizontal ? (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search blanks…"
          className="rounded border border-bone/20 bg-ink px-2 py-1 text-xs text-bone placeholder:text-bone/30 focus:border-hazard focus:outline-none"
        />
      ) : null}

      {/* Breadcrumb / back when drilled into a type */}
      {type && !needle ? (
        <button
          onClick={() => setType(null)}
          className="text-left text-[10px] font-mono uppercase tracking-widest text-bone/50 hover:text-hazard"
        >
          ‹ {gender} / {type}
        </button>
      ) : null}

      {showProducts ? (
        // Level 3: products in the type
        <div className={grid}>
          {products.map((b) => (
            <button key={b.id} onClick={() => onAdd(b)} title={`Add ${b.name}`} className={cardCls}>
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded bg-bone/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.image} alt={b.name} className="h-full w-full object-contain" draggable={false} loading="lazy" />
              </div>
              <p className="mt-1 truncate text-[11px] font-mono uppercase tracking-wide text-bone/80">{b.name}</p>
            </button>
          ))}
          {!products.length ? <p className="text-[11px] text-bone/30">No blanks match.</p> : null}
        </div>
      ) : (
        // Level 2: product-type cards (with thumbnails)
        <div className={grid}>
          {types.map((t) => (
            <button key={t.type} onClick={() => setType(t.type)} title={t.type} className={cardCls}>
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded bg-bone/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.image} alt={t.type} className="h-full w-full object-contain" draggable={false} loading="lazy" />
              </div>
              <p className="mt-1 truncate text-[11px] font-mono uppercase tracking-wide text-bone/80">{t.type}</p>
              <p className="text-[9px] font-mono uppercase tracking-wide text-bone/30">{t.count} items</p>
            </button>
          ))}
          {!types.length ? <p className="text-[11px] text-bone/30">No types.</p> : null}
        </div>
      )}
    </div>
  );
}
