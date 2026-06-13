"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Box { left: number; top: number; width: number; height: number }
interface Area { placement: string; label: string; areaWidth: number; areaHeight: number }
interface State { designUrl: string; areas: Area[]; current: string[]; name: string }

const EDITOR_MAX = 300;
const MIN_W = 40;

function clampBox(b: Box, a: Area, aspect: number, lock: boolean): Box {
  let width = Math.min(Math.max(MIN_W, b.width), a.areaWidth);
  let height = lock ? width / aspect : Math.min(Math.max(MIN_W, b.height), a.areaHeight);
  if (lock && height > a.areaHeight) { height = a.areaHeight; width = Math.min(height * aspect, a.areaWidth); }
  const left = Math.min(Math.max(0, b.left), a.areaWidth - width);
  const top = Math.min(Math.max(0, b.top), a.areaHeight - height);
  return { left, top, width, height };
}
function defaultBox(a: Area, aspect: number): Box {
  const width = a.areaWidth * 0.6;
  return clampBox({ left: (a.areaWidth - width) / 2, top: (a.areaHeight - width / aspect) / 2, width, height: width / aspect }, a, aspect, true);
}

export function ProductDesignEditor({ productId, onSaved, onClose }: { productId: string; onSaved: (hero: string | null) => void; onClose: () => void }) {
  const [state, setState] = useState<State | null>(null);
  const [aspect, setAspect] = useState(1);
  const [enabled, setEnabled] = useState<string[]>([]);
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const [active, setActive] = useState<string>("");
  const [lock, setLock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    fetch(`/api/admin/products/${productId}/design`)
      .then((r) => r.json())
      .then((d: State & { error?: string }) => {
        if (!on) return;
        if (d.error) return setError(d.error);
        const initial = d.current.length ? d.current : d.areas[0] ? [d.areas[0].placement] : [];
        const bx: Record<string, Box> = {};
        for (const pl of initial) { const a = d.areas.find((x) => x.placement === pl); if (a) bx[pl] = defaultBox(a, 1); }
        setState(d); setEnabled(initial); setBoxes(bx); setActive(initial[0] ?? "");
      })
      .catch((e) => on && setError(String(e)));
    return () => { on = false; };
  }, [productId]);

  const area = useMemo(() => state?.areas.find((a) => a.placement === active) ?? null, [state, active]);
  const box = active ? boxes[active] : undefined;
  const scale = area ? EDITOR_MAX / Math.max(area.areaWidth, area.areaHeight) : 1;

  // Re-fit every box when the design's aspect loads / lock changes.
  useEffect(() => {
    if (!state) return;
    setBoxes((cur) => {
      const next: Record<string, Box> = {};
      for (const [pl, b] of Object.entries(cur)) { const a = state.areas.find((x) => x.placement === pl); next[pl] = a ? clampBox(b, a, aspect, lock) : b; }
      return next;
    });
  }, [aspect, lock, state]);

  const setBox = useCallback((fn: (b: Box) => Box) => {
    if (!area || !active) return;
    setBoxes((cur) => ({ ...cur, [active]: clampBox(fn(cur[active]), area, aspect, lock) }));
  }, [area, active, aspect, lock]);

  const drag = useRef<{ mode: "move" | "resize"; sx: number; sy: number; box: Box } | null>(null);
  const start = (mode: "move" | "resize") => (e: React.PointerEvent) => { if (!box) return; e.stopPropagation(); e.preventDefault(); drag.current = { mode, sx: e.clientX, sy: e.clientY, box: { ...box } }; };
  const move = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dx = (e.clientX - d.sx) / scale, dy = (e.clientY - d.sy) / scale;
    if (d.mode === "move") setBox(() => ({ ...d.box, left: d.box.left + dx, top: d.box.top + dy }));
    else setBox(() => ({ ...d.box, width: d.box.width + dx, height: d.box.height + dy }));
  };
  const end = () => { drag.current = null; };

  const scalePct = area && box ? Math.round((box.width / area.areaWidth) * 100) : 100;
  const setScale = (pct: number) => { if (!area || !box) return; const cx = box.left + box.width / 2, cy = box.top + box.height / 2, width = (pct / 100) * area.areaWidth; setBox(() => ({ left: cx - width / 2, top: cy - (lock ? width / aspect : box.height) / 2, width, height: lock ? width / aspect : box.height })); };
  const align = (hx: 0 | 0.5 | 1, vy: 0 | 0.5 | 1) => { if (!area || !box) return; setBox((b) => ({ ...b, left: (area.areaWidth - b.width) * hx, top: (area.areaHeight - b.height) * vy })); };
  const nudge = (dxF: number, dyF: number) => { if (!area) return; const step = Math.round(area.areaWidth * 0.03); setBox((b) => ({ ...b, left: b.left + dxF * step, top: b.top + dyF * step })); };

  function togglePlacement(pl: string) {
    if (!state) return;
    if (enabled.includes(pl)) { if (enabled.length === 1) return; setEnabled((e) => e.filter((x) => x !== pl)); if (active === pl) setActive(enabled.find((x) => x !== pl) ?? ""); }
    else { const a = state.areas.find((x) => x.placement === pl); if (a) setBoxes((b) => ({ ...b, [pl]: defaultBox(a, aspect) })); setEnabled((e) => [...e, pl]); setActive(pl); }
  }

  async function save() {
    if (!state) return;
    setBusy(true); setError(null);
    try {
      const placements = enabled.map((pl) => { const a = state.areas.find((x) => x.placement === pl)!; const b = boxes[pl]; return { placement: pl, position: { areaWidth: a.areaWidth, areaHeight: a.areaHeight, width: Math.round(b.width), height: Math.round(b.height), left: Math.round(b.left), top: Math.round(b.top) } }; });
      const res = await fetch(`/api/admin/products/${productId}/design`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ placements }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Save failed");
      onSaved(d.heroImageUrl ?? null); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed"); setBusy(false); }
  }

  const dispW = area ? area.areaWidth * scale : EDITOR_MAX;
  const dispH = area ? area.areaHeight * scale : EDITOR_MAX;
  const Btn = "rounded border border-bone/20 px-2 py-1.5 text-[10px] font-mono uppercase tracking-widest text-bone/70 hover:border-hazard hover:text-bone";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-auto rounded-lg border border-bone/15 bg-ink-soft p-4 text-bone" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-widest text-bone/60">Customize design · {state?.name ?? ""}</span>
          <button onClick={onClose} className="text-[11px] font-mono uppercase tracking-widest text-bone/50 hover:text-hazard">Close</button>
        </div>

        {state ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={state.designUrl} alt="" className="hidden" onLoad={(e) => { const el = e.currentTarget; if (el.naturalWidth && el.naturalHeight) setAspect(el.naturalWidth / el.naturalHeight); }} />
        ) : null}

        {/* Placement chips — only the placements this product can print */}
        {state ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {state.areas.map((a) => {
              const on = enabled.includes(a.placement);
              return (
                <button key={a.placement} onClick={() => (on ? setActive(a.placement) : togglePlacement(a.placement))}
                  className={`flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-mono uppercase tracking-widest ${active === a.placement ? "border-hazard text-bone" : on ? "border-acid/50 text-acid" : "border-bone/20 text-bone/40"}`}>
                  {a.label}
                  {on ? <span onClick={(e) => { e.stopPropagation(); togglePlacement(a.placement); }} className="text-bone/40 hover:text-hazard" title="Remove">×</span> : <span className="text-bone/30">＋</span>}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="mt-3 grid gap-4 md:grid-cols-[auto,1fr]">
          {/* Print-area canvas */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative touch-none rounded border border-dashed border-bone/30 bg-[repeating-conic-gradient(#2a2a2a_0%_25%,#222_0%_50%)] bg-[length:16px_16px]" style={{ width: dispW, height: dispH }} onPointerMove={move} onPointerUp={end} onPointerLeave={end}>
              {state && box && area ? (
                <div className="absolute cursor-move border border-hazard" style={{ left: box.left * scale, top: box.top * scale, width: box.width * scale, height: box.height * scale }} onPointerDown={start("move")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={state.designUrl} alt="design" className={`pointer-events-none h-full w-full ${lock ? "object-contain" : "object-fill"}`} draggable={false} />
                  <span onPointerDown={start("resize")} className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-se-resize rounded-sm border border-hazard bg-hazard" />
                </div>
              ) : (<div className="flex h-full items-center justify-center text-[10px] font-mono uppercase tracking-widest text-bone/40">{error ? "Error" : "Loading…"}</div>)}
            </div>
            <p className="text-[10px] text-bone/40">{area ? `${area.label} · ${area.areaWidth}×${area.areaHeight}px` : ""}</p>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="w-10 text-[11px] font-mono uppercase tracking-widest text-bone/50">Size</span>
              <input type="range" min={5} max={100} value={scalePct} onChange={(e) => setScale(Number(e.target.value))} className="flex-1 accent-hazard" />
              <span className="w-10 text-right text-xs tabular-nums text-bone/60">{scalePct}%</span>
            </div>

            <div className="flex items-start gap-4">
              <div>
                <p className="mb-1 text-[10px] font-mono uppercase tracking-widest text-bone/40">Align</p>
                <div className="grid grid-cols-3 gap-1">
                  {([0, 0.5, 1] as const).map((vy) => ([0, 0.5, 1] as const).map((hx) => (
                    <button key={`${hx}-${vy}`} onClick={() => align(hx, vy)} title="Align" className="h-6 w-6 rounded border border-bone/20 hover:border-hazard">
                      <span className="mx-auto block h-1.5 w-1.5 rounded-[1px] bg-bone/50" />
                    </button>
                  )))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-mono uppercase tracking-widest text-bone/40">Nudge</p>
                <div className="grid grid-cols-3 gap-1">
                  <span /><button onClick={() => nudge(0, -1)} className="h-6 w-6 rounded border border-bone/20 hover:border-hazard">↑</button><span />
                  <button onClick={() => nudge(-1, 0)} className="h-6 w-6 rounded border border-bone/20 hover:border-hazard">←</button>
                  <button onClick={() => align(0.5, 0.5)} className="h-6 w-6 rounded border border-bone/20 hover:border-hazard" title="Center">•</button>
                  <button onClick={() => nudge(1, 0)} className="h-6 w-6 rounded border border-bone/20 hover:border-hazard">→</button>
                  <span /><button onClick={() => nudge(0, 1)} className="h-6 w-6 rounded border border-bone/20 hover:border-hazard">↓</button><span />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => setScale(100)} className={Btn}>Fill width</button>
              <button onClick={() => align(0.5, 0.5)} className={Btn}>Center</button>
              <button onClick={() => setLock((v) => !v)} className={`${Btn} ${lock ? "" : "border-hazard text-bone"}`}>{lock ? "🔒 Aspect" : "↔ Free"}</button>
            </div>
            <p className="text-[10px] text-bone/40">Drag to move, drag the corner to resize. Toggle placements above to print on multiple areas. “Free” unlocks aspect (can stretch).</p>
          </div>
        </div>

        {error ? <p className="mt-2 text-xs text-hazard">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <button disabled={busy || !enabled.length} onClick={save} className="flex-1 rounded bg-hazard px-3 py-2 text-xs font-bold uppercase tracking-widest text-bone disabled:opacity-50">{busy ? "Saving & re-rendering…" : `Save (${enabled.length} placement${enabled.length === 1 ? "" : "s"})`}</button>
          <button onClick={onClose} className="rounded border border-bone/20 px-3 py-2 text-xs font-bold uppercase tracking-widest text-bone/70">Cancel</button>
        </div>
      </div>
    </div>
  );
}
