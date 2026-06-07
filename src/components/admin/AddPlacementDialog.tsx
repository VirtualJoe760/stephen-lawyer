"use client";
import { useEffect, useState } from "react";

interface Area {
  placement: string;
  label: string;
  areaWidth: number;
  areaHeight: number;
}
interface CompPlacement {
  placement: string;
  designId: string;
  position: { areaWidth: number; areaHeight: number; width: number; height: number; top: number; left: number } | null;
}

// Drag a design onto a composite → pick which placement it goes on, then render.
export function AddPlacementDialog({
  compositionId,
  designId,
  onAdded,
  onClose,
}: {
  compositionId: string;
  designId: string;
  onAdded: (previewUrl: string) => void;
  onClose: () => void;
}) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [existing, setExisting] = useState<CompPlacement[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    (async () => {
      const c = await fetch(`/api/admin/compositions/${compositionId}`).then((r) => r.json()).catch(() => null);
      if (!on) return;
      const comp = c?.composition;
      if (!comp) {
        setError("Could not load composite");
        setLoading(false);
        return;
      }
      const pa = await fetch(`/api/admin/blank/${Number(comp.templateKey)}/printareas`).then((r) => r.json()).catch(() => ({}));
      if (!on) return;
      setAreas(pa.placements ?? []);
      const ex: CompPlacement[] =
        comp.placements?.length
          ? comp.placements.map((p: CompPlacement) => ({ placement: p.placement, designId: p.designId, position: p.position }))
          : [{ placement: comp.placement, designId: comp.designId, position: comp.position }];
      setExisting(ex);
      setLoading(false);
    })();
    return () => {
      on = false;
    };
  }, [compositionId]);

  const used = new Set(existing.map((e) => e.placement));
  const available = areas.filter((a) => !used.has(a.placement));

  async function add(area: Area) {
    setBusy(true);
    setError(null);
    try {
      const w = Math.round(area.areaWidth * 0.7);
      const h = Math.min(w, area.areaHeight);
      const newEntry: CompPlacement = {
        placement: area.placement,
        designId,
        position: {
          areaWidth: area.areaWidth,
          areaHeight: area.areaHeight,
          width: w,
          height: h,
          left: Math.round((area.areaWidth - w) / 2),
          top: Math.round((area.areaHeight - h) / 2),
        },
      };
      const placements = [...existing, newEntry];
      const res = await fetch(`/api/admin/compositions/${compositionId}/mockup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placements }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.previewUrl) throw new Error(d.error ?? "Failed to add");
      onAdded(d.previewUrl);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-lg border border-bone/15 bg-ink-soft p-4 text-bone" onClick={(e) => e.stopPropagation()}>
        <p className="font-mono text-xs uppercase tracking-widest text-bone/60">Add design to product</p>
        <p className="mt-1 text-[11px] text-bone/40">Choose which print area this design goes on.</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {loading ? (
            <span className="text-xs text-bone/40">Loading…</span>
          ) : available.length ? (
            available.map((a) => (
              <button
                key={a.placement}
                disabled={busy}
                onClick={() => add(a)}
                className="rounded border border-bone/20 px-3 py-2 text-[11px] font-mono uppercase tracking-widest text-bone/70 hover:border-hazard hover:text-bone disabled:opacity-50"
              >
                {a.label}
              </button>
            ))
          ) : (
            <span className="text-xs text-bone/40">All print areas are already used on this product.</span>
          )}
        </div>

        {busy ? <p className="mt-3 text-[11px] text-bone/50">Rendering Printful mockup…</p> : null}
        {error ? <p className="mt-3 text-xs text-hazard">{error}</p> : null}

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="rounded px-3 py-2 text-xs font-mono uppercase tracking-widest text-bone/50 hover:text-bone">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
