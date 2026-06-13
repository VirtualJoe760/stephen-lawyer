"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}
interface Area {
  placement: string;
  areaWidth: number;
  areaHeight: number;
}
interface State {
  placement: string;
  designUrl: string;
  areas: Area[];
  name: string;
}

const EDITOR_MAX = 300;
const MIN_W = 50;

function fitClamp(b: Box, aw: number, ah: number, aspect: number): Box {
  let width = Math.min(Math.max(MIN_W, b.width), aw);
  let height = width / aspect;
  if (height > ah) {
    height = ah;
    width = height * aspect;
  }
  const left = Math.min(Math.max(0, b.left), aw - width);
  const top = Math.min(Math.max(0, b.top), ah - height);
  return { left, top, width, height };
}

export function ProductDesignEditor({
  productId,
  onSaved,
  onClose,
}: {
  productId: string;
  onSaved: (heroImageUrl: string | null) => void;
  onClose: () => void;
}) {
  const [state, setState] = useState<State | null>(null);
  const [aspect, setAspect] = useState(1);
  const [box, setBox] = useState<Box | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    fetch(`/api/admin/products/${productId}/design`)
      .then((r) => r.json())
      .then((d) => {
        if (!on) return;
        if (d.error) return setError(d.error);
        setState(d);
      })
      .catch((e) => on && setError(String(e)));
    return () => {
      on = false;
    };
  }, [productId]);

  const area = useMemo(
    () => state?.areas.find((a) => a.placement === state.placement) ?? state?.areas[0] ?? null,
    [state],
  );
  const scale = area ? EDITOR_MAX / Math.max(area.areaWidth, area.areaHeight) : 1;

  // Seed a centered ~70%-width box once we know the area + aspect.
  useEffect(() => {
    if (!area || box) return;
    const width = area.areaWidth * 0.7;
    setBox(fitClamp({ left: (area.areaWidth - width) / 2, top: 0, width, height: width / aspect }, area.areaWidth, area.areaHeight, aspect));
  }, [area, aspect, box]);

  const update = useCallback(
    (fn: (b: Box) => Box) => {
      if (!area) return;
      setBox((b) => (b ? fitClamp(fn(b), area.areaWidth, area.areaHeight, aspect) : b));
    },
    [area, aspect],
  );

  const drag = useRef<{ mode: "move" | "resize"; sx: number; sy: number; box: Box } | null>(null);
  const start = (mode: "move" | "resize") => (e: React.PointerEvent) => {
    if (!box) return;
    e.stopPropagation();
    e.preventDefault();
    drag.current = { mode, sx: e.clientX, sy: e.clientY, box: { ...box } };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / scale;
    const dy = (e.clientY - d.sy) / scale;
    if (d.mode === "move") update(() => ({ ...d.box, left: d.box.left + dx, top: d.box.top + dy }));
    else update(() => ({ ...d.box, width: d.box.width + dx }));
  };
  const end = () => {
    drag.current = null;
  };

  const scalePct = area && box ? Math.round((box.width / area.areaWidth) * 100) : 100;
  const setScale = (pct: number) => {
    if (!area || !box) return;
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const width = (pct / 100) * area.areaWidth;
    update(() => ({ left: cx - width / 2, top: cy - width / aspect / 2, width, height: width / aspect }));
  };
  const center = () => area && update((b) => ({ ...b, left: (area.areaWidth - b.width) / 2, top: (area.areaHeight - b.height) / 2 }));

  async function save() {
    if (!area || !box) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}/design`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position: {
            areaWidth: area.areaWidth,
            areaHeight: area.areaHeight,
            width: Math.round(box.width),
            height: Math.round(box.height),
            top: Math.round(box.top),
            left: Math.round(box.left),
          },
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Save failed");
      onSaved(d.heroImageUrl ?? null);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setBusy(false);
    }
  }

  const dispW = area ? area.areaWidth * scale : EDITOR_MAX;
  const dispH = area ? area.areaHeight * scale : EDITOR_MAX;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-bone/15 bg-ink-soft p-4 text-bone" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-widest text-bone/60">
            Edit design{state ? ` · ${state.placement}` : ""}
          </span>
          <button onClick={onClose} className="text-[11px] font-mono uppercase tracking-widest text-bone/50 hover:text-hazard">
            Close
          </button>
        </div>

        {state ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={state.designUrl}
            alt=""
            className="hidden"
            onLoad={(e) => {
              const el = e.currentTarget;
              if (el.naturalWidth && el.naturalHeight) setAspect(el.naturalWidth / el.naturalHeight);
            }}
          />
        ) : null}

        <div className="mt-3 flex flex-col items-center gap-3">
          <div
            className="relative touch-none rounded border border-dashed border-bone/30 bg-[repeating-conic-gradient(#2a2a2a_0%_25%,#222_0%_50%)] bg-[length:16px_16px]"
            style={{ width: dispW, height: dispH }}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
          >
            {state && box && area ? (
              <div
                className="absolute cursor-move border border-hazard"
                style={{ left: box.left * scale, top: box.top * scale, width: box.width * scale, height: box.height * scale }}
                onPointerDown={start("move")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={state.designUrl} alt="design" className="pointer-events-none h-full w-full object-contain" draggable={false} />
                <span onPointerDown={start("resize")} className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-se-resize rounded-sm border border-hazard bg-hazard" />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] font-mono uppercase tracking-widest text-bone/40">
                {error ? "Error" : "Loading…"}
              </div>
            )}
          </div>

          <div className="flex w-full items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-bone/50">Size</span>
            <input type="range" min={5} max={100} value={scalePct} onChange={(e) => setScale(Number(e.target.value))} className="flex-1 accent-hazard" />
            <span className="w-10 text-right text-xs tabular-nums text-bone/60">{scalePct}%</span>
          </div>
          <div className="flex w-full gap-2">
            <button onClick={() => setScale(100)} className="flex-1 rounded border border-bone/20 px-2 py-1.5 text-[10px] font-mono uppercase tracking-widest text-bone/70 hover:border-hazard hover:text-bone">
              Fill width
            </button>
            <button onClick={center} className="flex-1 rounded border border-bone/20 px-2 py-1.5 text-[10px] font-mono uppercase tracking-widest text-bone/70 hover:border-hazard hover:text-bone">
              Center
            </button>
          </div>
          <p className="self-start text-[10px] text-bone/40">Drag to move, drag the corner to resize. Saving re-renders the product.</p>
        </div>

        {error ? <p className="mt-2 text-xs text-hazard">{error}</p> : null}

        <div className="mt-4 flex gap-2">
          <button disabled={busy || !box} onClick={save} className="flex-1 rounded bg-hazard px-3 py-2 text-xs font-bold uppercase tracking-widest text-bone disabled:opacity-50">
            {busy ? "Saving & re-rendering…" : "Save changes"}
          </button>
          <button onClick={onClose} className="rounded border border-bone/20 px-3 py-2 text-xs font-bold uppercase tracking-widest text-bone/70">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
