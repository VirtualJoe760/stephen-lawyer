"use client";
import { useEffect, useState } from "react";

export interface CombineTarget {
  design: { designId: string };
  template: { productId: string; name: string; image: string; position: { x: number; y: number } };
}

export function CombineDialog({
  target,
  onCancel,
  onConfirm,
}: {
  target: CombineTarget;
  onCancel: () => void;
  onConfirm: (placement: string) => void;
}) {
  const [available, setAvailable] = useState<Record<string, string> | null>(null);
  const [allOver, setAllOver] = useState(false);
  const [placement, setPlacement] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/blank/${target.template.productId}/placements`)
      .then((r) => r.json())
      .then((j: { available?: Record<string, string>; allOver?: boolean }) => {
        if (!active) return;
        const av = j.available ?? { front: "Front print" };
        setAvailable(av);
        setAllOver(!!j.allOver);
        const keys = Object.keys(av);
        setPlacement(keys.includes("front") ? "front" : (keys[0] ?? "front"));
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setAvailable({ front: "Front print" });
        setPlacement("front");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [target.template.productId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-lg border border-bone/15 bg-ink-soft p-4 text-bone"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-mono text-xs uppercase tracking-widest text-hazard">Combine</p>
        <h2 className="mt-1 truncate font-display text-xl uppercase leading-none">{target.template.name}</h2>
        <p className="mt-1 text-xs text-bone/50">Choose where the design goes on the garment.</p>

        {loading ? (
          <p className="mt-4 text-sm text-bone/40">Loading placements…</p>
        ) : (
          <div className="mt-4 grid max-h-60 grid-cols-2 gap-2 overflow-y-auto">
            {Object.entries(available ?? {}).map(([k, label]) => {
              const over = /dtfabric|all[_-]?over/i.test(k);
              return (
                <button
                  key={k}
                  onClick={() => setPlacement(k)}
                  className={`rounded border px-3 py-2 text-left text-xs ${
                    placement === k ? "border-hazard text-bone" : "border-bone/15 text-bone/60"
                  }`}
                >
                  {label}
                  {over ? <span className="ml-1 text-acid">· all-over</span> : null}
                </button>
              );
            })}
          </div>
        )}
        {allOver ? <p className="mt-3 text-[11px] text-acid">This product supports all-over print.</p> : null}

        <div className="mt-5 flex gap-2">
          <button
            disabled={loading || !placement}
            onClick={() => onConfirm(placement)}
            className="flex-1 rounded bg-hazard px-3 py-2 text-xs font-bold uppercase tracking-widest text-bone disabled:opacity-50"
          >
            Combine →
          </button>
          <button
            onClick={onCancel}
            className="rounded border border-bone/20 px-3 py-2 text-xs font-bold uppercase tracking-widest text-bone/70"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
