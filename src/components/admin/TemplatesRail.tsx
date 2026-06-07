"use client";
import { useMemo, useState } from "react";
import type { CatalogBlank, BlankCategory } from "@/lib/printful/catalog";

const TABS: { key: "all" | BlankCategory; label: string }[] = [
  { key: "all", label: "All" },
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
  const [cat, setCat] = useState<"all" | BlankCategory>("all");
  const [q, setQ] = useState("");
  const horizontal = orientation === "horizontal";

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return blanks.filter(
      (b) => (cat === "all" || b.category === cat) && (!needle || b.name.toLowerCase().includes(needle)),
    );
  }, [blanks, cat, q]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setCat(t.key)}
            className={`rounded px-2 py-1 text-[10px] font-mono uppercase tracking-wide ${
              cat === t.key ? "bg-hazard text-bone" : "bg-bone/5 text-bone/60 hover:text-bone"
            }`}
          >
            {t.label}
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
      <div className={horizontal ? "flex gap-2 overflow-x-auto pb-1" : "flex flex-col gap-2 overflow-y-auto"}>
        {filtered.map((b) => (
          <button
            key={b.id}
            onClick={() => onAdd(b)}
            title={`Add ${b.name}`}
            className={`shrink-0 rounded-md border border-bone/15 bg-ink-soft p-2 text-left transition-colors hover:border-hazard ${
              horizontal ? "w-28" : "w-full"
            }`}
          >
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded bg-bone/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.image} alt={b.name} className="h-full w-full object-contain" draggable={false} loading="lazy" />
            </div>
            <p className="mt-1 truncate text-[11px] font-mono uppercase tracking-wide text-bone/80">{b.name}</p>
          </button>
        ))}
        {!filtered.length ? <p className="text-[11px] text-bone/30">No blanks match.</p> : null}
      </div>
    </div>
  );
}
