"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}
interface PlacementArea {
  placement: string;
  label: string;
  areaWidth: number;
  areaHeight: number;
}
interface DesignLite {
  id: string;
  url: string;
  thumbUrl: string;
  prompt: string;
}
interface Entry {
  placement: string;
  designId: string;
  designUrl: string;
  box: Box;
}

const EDITOR_MAX = 300;
const MIN_W = 50;

function fitClamp(b: Box, areaW: number, areaH: number, aspect: number): Box {
  let width = Math.min(Math.max(MIN_W, b.width), areaW);
  let height = width / aspect;
  if (height > areaH) {
    height = areaH;
    width = height * aspect;
  }
  const left = Math.min(Math.max(0, b.left), areaW - width);
  const top = Math.min(Math.max(0, b.top), areaH - height);
  return { left, top, width, height };
}
function defaultBox(areaW: number, areaH: number, aspect: number): Box {
  const f = fitClamp({ left: 0, top: 0, width: areaW, height: areaW / aspect }, areaW, areaH, aspect);
  return { ...f, left: (areaW - f.width) / 2, top: (areaH - f.height) / 2 };
}

export function PlacementEditor({
  compositionId,
  onSaved,
  onClose,
}: {
  compositionId: string;
  onSaved: (previewUrl: string) => void;
  onClose: () => void;
}) {
  const [areas, setAreas] = useState<PlacementArea[]>([]);
  const [designs, setDesigns] = useState<DesignLite[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [active, setActive] = useState(0);
  const [aspects, setAspects] = useState<Record<string, number>>({});
  const [mockups, setMockups] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const seeded = useRef(false);

  // Load composition → then print areas + catalogue designs.
  useEffect(() => {
    let on = true;
    (async () => {
      const c = await fetch(`/api/admin/compositions/${compositionId}`).then((r) => r.json()).catch(() => null);
      if (!on) return;
      const comp = c?.composition;
      if (!comp) {
        setError("Could not load composition");
        return;
      }
      const productId = Number(comp.templateKey);
      const [pa, dl] = await Promise.all([
        fetch(`/api/admin/blank/${productId}/printareas`).then((r) => r.json()).catch(() => ({})),
        fetch(`/api/admin/designs?catalogueId=${comp.catalogueId}`).then((r) => r.json()).catch(() => ({})),
      ]);
      if (!on) return;
      const loadedAreas: PlacementArea[] = pa.placements ?? [];
      setAreas(loadedAreas);
      setDesigns((dl.designs ?? []).map((d: DesignLite) => ({ id: d.id, url: d.url, thumbUrl: d.thumbUrl, prompt: d.prompt })));

      // Seed entries from comp.placements, else the single design.
      const areaOf = (p: string) => loadedAreas.find((a) => a.placement === p);
      const raw: Array<{ placement: string; designId: string; designUrl?: string; position: Box & { areaWidth: number; areaHeight: number } | null }> =
        comp.placements?.length
          ? comp.placements
          : [{ placement: comp.placement, designId: comp.designId, designUrl: comp.designUrl, position: comp.position }];
      const seededEntries: Entry[] = raw
        .map((p) => {
          const a = areaOf(p.placement) ?? loadedAreas[0];
          if (!a) return null;
          const box =
            p.position && p.position.areaWidth === a.areaWidth
              ? { left: p.position.left, top: p.position.top, width: p.position.width, height: p.position.height }
              : defaultBox(a.areaWidth, a.areaHeight, 1);
          return { placement: a.placement, designId: p.designId, designUrl: p.designUrl ?? comp.designUrl, box };
        })
        .filter(Boolean) as Entry[];
      setEntries(seededEntries);
      seeded.current = true;
    })();
    return () => {
      on = false;
    };
  }, [compositionId]);

  const entry = entries[active] ?? null;
  const area = useMemo(() => areas.find((a) => a.placement === entry?.placement) ?? null, [areas, entry]);
  const aspect = entry ? aspects[entry.designId] ?? 1 : 1;
  const scale = area ? EDITOR_MAX / Math.max(area.areaWidth, area.areaHeight) : 1;

  const usedPlacements = new Set(entries.map((e) => e.placement));
  const availablePlacements = areas.filter((a) => !usedPlacements.has(a.placement));

  const setActiveBox = useCallback(
    (updater: (b: Box) => Box) => {
      if (!area) return;
      setEntries((cur) =>
        cur.map((e, i) =>
          i === active ? { ...e, box: fitClamp(updater(e.box), area.areaWidth, area.areaHeight, aspects[e.designId] ?? 1) } : e,
        ),
      );
    },
    [active, area, aspects],
  );

  // Pointer drag / resize on the active box.
  const dragRef = useRef<{ mode: "move" | "resize"; sx: number; sy: number; box: Box } | null>(null);
  const startDrag = (mode: "move" | "resize") => (e: React.PointerEvent) => {
    if (!entry) return;
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = { mode, sx: e.clientX, sy: e.clientY, box: { ...entry.box } };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const ddx = (e.clientX - d.sx) / scale;
    const ddy = (e.clientY - d.sy) / scale;
    if (d.mode === "move") setActiveBox(() => ({ ...d.box, left: d.box.left + ddx, top: d.box.top + ddy }));
    else setActiveBox(() => ({ ...d.box, width: d.box.width + ddx }));
  };
  const endDrag = () => {
    dragRef.current = null;
  };

  const setScalePct = (pct: number) => {
    if (!area || !entry) return;
    const cx = entry.box.left + entry.box.width / 2;
    const cy = entry.box.top + entry.box.height / 2;
    const width = (pct / 100) * area.areaWidth;
    setActiveBox(() => ({ left: cx - width / 2, top: cy - width / aspect / 2, width, height: width / aspect }));
  };
  const recenter = () => {
    if (!area || !entry) return;
    setActiveBox((b) => ({ ...b, left: (area.areaWidth - b.width) / 2, top: (area.areaHeight - b.height) / 2 }));
  };
  const scalePct = area && entry ? Math.round((entry.box.width / area.areaWidth) * 100) : 100;

  const removeEntry = (i: number) => {
    setEntries((cur) => (cur.length <= 1 ? cur : cur.filter((_, idx) => idx !== i)));
    setActive(0);
    setMockups({});
  };
  const addEntry = (placement: string, designId: string) => {
    const a = areas.find((x) => x.placement === placement);
    const d = designs.find((x) => x.id === designId);
    if (!a || !d) return;
    setEntries((cur) => [...cur, { placement, designId, designUrl: d.url, box: defaultBox(a.areaWidth, a.areaHeight, aspects[designId] ?? 1) }]);
    setActive(entries.length);
    setAdding(false);
    setMockups({});
  };

  async function generate() {
    if (!entries.length) return;
    setBusy(true);
    setError(null);
    try {
      const payload = entries.map((e) => {
        const a = areas.find((x) => x.placement === e.placement)!;
        return {
          placement: e.placement,
          designId: e.designId,
          position: {
            areaWidth: a.areaWidth,
            areaHeight: a.areaHeight,
            width: Math.round(e.box.width),
            height: Math.round(e.box.height),
            top: Math.round(e.box.top),
            left: Math.round(e.box.left),
          },
        };
      });
      const res = await fetch(`/api/admin/compositions/${compositionId}/mockup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placements: payload }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.mockups) throw new Error(d.error ?? "Mockup failed");
      setMockups(d.mockups);
      if (d.previewUrl) onSaved(d.previewUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mockup failed");
    } finally {
      setBusy(false);
    }
  }

  const dispW = area ? area.areaWidth * scale : EDITOR_MAX;
  const dispH = area ? area.areaHeight * scale : EDITOR_MAX;
  // Some products only return a single mockup view — group placements by image.
  const byUrl: Record<string, string[]> = {};
  for (const [pl, url] of Object.entries(mockups)) (byUrl[url] ??= []).push(pl);
  const mockupList = Object.entries(byUrl); // [url, placements[]]
  const viewsCollapsed = Object.keys(mockups).length > mockupList.length;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-bone/15 bg-ink-soft text-bone"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-bone/10 px-4 py-2">
          <span className="font-mono text-xs uppercase tracking-widest text-bone/60">Designs & placement</span>
          <button onClick={onClose} className="text-[11px] font-mono uppercase tracking-widest text-bone/50 hover:text-hazard">
            Close
          </button>
        </div>

        {/* Hidden loaders for each design's natural aspect ratio. */}
        {[...new Set(entries.map((e) => e.designId))].map((id) => {
          const url = entries.find((e) => e.designId === id)?.designUrl;
          if (!url) return null;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={id}
              src={url}
              alt=""
              className="hidden"
              onLoad={(ev) => {
                const el = ev.currentTarget;
                if (el.naturalWidth && el.naturalHeight)
                  setAspects((m) => (m[id] ? m : { ...m, [id]: el.naturalWidth / el.naturalHeight }));
              }}
            />
          );
        })}

        {/* Placement chips */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-bone/10 px-4 py-2">
          {entries.map((e, i) => {
            const label = areas.find((a) => a.placement === e.placement)?.label ?? e.placement;
            return (
              <span
                key={`${e.placement}-${i}`}
                className={`flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-mono uppercase tracking-widest ${
                  i === active ? "border-hazard text-bone" : "border-bone/20 text-bone/60"
                }`}
              >
                <button onClick={() => setActive(i)}>{label}</button>
                {entries.length > 1 ? (
                  <button onClick={() => removeEntry(i)} className="text-bone/40 hover:text-hazard" title="Remove placement">
                    ×
                  </button>
                ) : null}
              </span>
            );
          })}
          {availablePlacements.length && designs.length ? (
            <button
              onClick={() => setAdding((v) => !v)}
              className="rounded border border-dashed border-bone/30 px-2 py-1 text-[11px] font-mono uppercase tracking-widest text-bone/60 hover:border-hazard hover:text-bone"
            >
              ＋ Add design
            </button>
          ) : null}
        </div>

        {/* Add picker */}
        {adding ? (
          <div className="border-b border-bone/10 bg-black/20 px-4 py-3">
            <p className="mb-2 text-[11px] font-mono uppercase tracking-widest text-bone/50">Pick a placement, then a design</p>
            <AddPicker placements={availablePlacements} designs={designs} onPick={addEntry} onCancel={() => setAdding(false)} />
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 gap-4 overflow-auto p-4 md:grid-cols-2">
          {/* Left: interactive editor for the active placement */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="relative touch-none rounded border border-dashed border-bone/30 bg-[repeating-conic-gradient(#2a2a2a_0%_25%,#222_0%_50%)] bg-[length:16px_16px]"
              style={{ width: dispW, height: dispH }}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
            >
              {entry && area ? (
                <div
                  className="absolute cursor-move border border-hazard"
                  style={{ left: entry.box.left * scale, top: entry.box.top * scale, width: entry.box.width * scale, height: entry.box.height * scale }}
                  onPointerDown={startDrag("move")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={entry.designUrl} alt="design" className="pointer-events-none h-full w-full object-contain" draggable={false} />
                  <span
                    onPointerDown={startDrag("resize")}
                    className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-se-resize rounded-sm border border-hazard bg-hazard"
                  />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] font-mono uppercase tracking-widest text-bone/40">
                  Loading…
                </div>
              )}
            </div>
            <div className="flex w-full items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-bone/50">Size</span>
              <input type="range" min={5} max={100} value={scalePct} onChange={(e) => setScalePct(Number(e.target.value))} className="flex-1 accent-hazard" />
              <span className="w-10 text-right text-xs tabular-nums text-bone/60">{scalePct}%</span>
            </div>
            <div className="flex w-full gap-2">
              <button onClick={() => setScalePct(100)} className="flex-1 rounded border border-bone/20 px-2 py-1.5 text-[10px] font-mono uppercase tracking-widest text-bone/70 hover:border-hazard hover:text-bone">
                Fill width
              </button>
              <button onClick={recenter} className="flex-1 rounded border border-bone/20 px-2 py-1.5 text-[10px] font-mono uppercase tracking-widest text-bone/70 hover:border-hazard hover:text-bone">
                Center
              </button>
            </div>
            <p className="self-start text-[10px] text-bone/40">Drag to move, drag the corner to resize. Clamped to the print area.</p>
          </div>

          {/* Right: rendered Printful mockups */}
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded border border-bone/10 bg-black/30 p-3">
            {mockupList.length ? (
              <>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {mockupList.map(([url, pls]) => (
                    <div key={url} className="flex flex-col items-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={pls.join(", ")} className="max-h-[40dvh] w-auto object-contain" />
                      <span className="mt-1 text-[10px] font-mono uppercase tracking-widest text-bone/50">{pls.join(" · ")}</span>
                    </div>
                  ))}
                </div>
                {viewsCollapsed ? (
                  <p className="mt-2 text-center text-[10px] text-bone/40">
                    This product only previews one view — every placement is still printed.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-center text-xs text-bone/40">{busy ? "Rendering Printful mockups…" : "Set sizes, then generate real Printful mockups."}</p>
            )}
          </div>
        </div>

        {error ? <p className="px-4 text-xs text-hazard">{error}</p> : null}

        <div className="flex gap-2 border-t border-bone/10 p-3">
          <button disabled={busy || !entries.length} onClick={generate} className="flex-1 rounded bg-hazard px-3 py-2 text-xs font-bold uppercase tracking-widest text-bone disabled:opacity-50">
            {busy ? "Rendering…" : "Generate Printful mockup"}
          </button>
          <button onClick={onClose} className="rounded border border-bone/20 px-3 py-2 text-xs font-bold uppercase tracking-widest text-bone/70">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// Two-step picker: choose a placement, then a design.
function AddPicker({
  placements,
  designs,
  onPick,
  onCancel,
}: {
  placements: PlacementArea[];
  designs: DesignLite[];
  onPick: (placement: string, designId: string) => void;
  onCancel: () => void;
}) {
  const [placement, setPlacement] = useState(placements[0]?.placement ?? "");
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {placements.map((p) => (
          <button
            key={p.placement}
            onClick={() => setPlacement(p.placement)}
            className={`rounded border px-2 py-1 text-[11px] font-mono uppercase tracking-widest ${
              placement === p.placement ? "border-hazard text-bone" : "border-bone/20 text-bone/60"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {designs.map((d) => (
          <button
            key={d.id}
            onClick={() => placement && onPick(placement, d.id)}
            title={d.prompt}
            className="h-14 w-14 overflow-hidden rounded border border-bone/20 hover:border-hazard"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.thumbUrl} alt={d.prompt} className="h-full w-full object-cover" />
          </button>
        ))}
        <button onClick={onCancel} className="text-[11px] font-mono uppercase tracking-widest text-bone/40 hover:text-bone">
          Cancel
        </button>
      </div>
    </div>
  );
}
