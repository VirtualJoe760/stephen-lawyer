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
export interface InitialPosition {
  areaWidth: number;
  areaHeight: number;
  width: number;
  height: number;
  top: number;
  left: number;
}

const EDITOR_MAX = 320; // px for the longer side of the print-area preview
const MIN_W = 50; // min design width in print px

// Keep the design box inside the print area with aspect locked (height from width).
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
  const fitted = fitClamp({ left: 0, top: 0, width: areaW, height: areaW / aspect }, areaW, areaH, aspect);
  return { ...fitted, left: (areaW - fitted.width) / 2, top: (areaH - fitted.height) / 2 };
}

export function PlacementEditor({
  compositionId,
  productId,
  designUrl,
  initialPlacement,
  initialPosition,
  onSaved,
  onClose,
}: {
  compositionId: string;
  productId: number;
  designUrl: string;
  initialPlacement: string;
  initialPosition?: InitialPosition | null;
  onSaved: (mockupUrl: string) => void;
  onClose: () => void;
}) {
  const [areas, setAreas] = useState<PlacementArea[]>([]);
  const [placement, setPlacement] = useState(initialPlacement);
  const [aspect, setAspect] = useState(1);
  const [box, setBox] = useState<Box | null>(null);
  const [mockupUrl, setMockupUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const area = useMemo(() => areas.find((a) => a.placement === placement) ?? null, [areas, placement]);
  const scale = area ? EDITOR_MAX / Math.max(area.areaWidth, area.areaHeight) : 1;

  // Fetch print-area dimensions for this product.
  useEffect(() => {
    let active = true;
    fetch(`/api/admin/blank/${productId}/printareas`)
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (d.error) setError(d.error);
        setAreas(d.placements ?? []);
        setLoaded(true);
      })
      .catch((e) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, [productId]);

  // Once areas + aspect are known, seed the box (from saved position or default).
  useEffect(() => {
    if (!area || box) return;
    if (
      initialPosition &&
      initialPosition.areaWidth === area.areaWidth &&
      initialPosition.areaHeight === area.areaHeight
    ) {
      setBox(
        fitClamp(
          {
            left: initialPosition.left,
            top: initialPosition.top,
            width: initialPosition.width,
            height: initialPosition.height,
          },
          area.areaWidth,
          area.areaHeight,
          aspect,
        ),
      );
    } else {
      setBox(defaultBox(area.areaWidth, area.areaHeight, aspect));
    }
  }, [area, aspect, box, initialPosition]);

  // Re-fit when switching placement (different area).
  const switchPlacement = useCallback(
    (next: string) => {
      setPlacement(next);
      const a = areas.find((x) => x.placement === next);
      if (a) setBox(defaultBox(a.areaWidth, a.areaHeight, aspect));
      setMockupUrl(null);
    },
    [areas, aspect],
  );

  // Pointer drag / resize.
  const dragRef = useRef<{ mode: "move" | "resize"; sx: number; sy: number; box: Box } | null>(null);
  const startDrag = (mode: "move" | "resize") => (e: React.PointerEvent) => {
    if (!box) return;
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = { mode, sx: e.clientX, sy: e.clientY, box: { ...box } };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !area) return;
    const ddx = (e.clientX - d.sx) / scale;
    const ddy = (e.clientY - d.sy) / scale;
    if (d.mode === "move") {
      setBox(fitClamp({ ...d.box, left: d.box.left + ddx, top: d.box.top + ddy }, area.areaWidth, area.areaHeight, aspect));
    } else {
      setBox(fitClamp({ ...d.box, width: d.box.width + ddx }, area.areaWidth, area.areaHeight, aspect));
    }
  };
  const endDrag = () => {
    dragRef.current = null;
  };

  const recenter = () => {
    if (!area || !box) return;
    setBox(fitClamp({ ...box, left: (area.areaWidth - box.width) / 2, top: (area.areaHeight - box.height) / 2 }, area.areaWidth, area.areaHeight, aspect));
  };
  const setScalePct = (pct: number) => {
    if (!area || !box) return;
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const width = (pct / 100) * area.areaWidth;
    const height = width / aspect;
    setBox(fitClamp({ left: cx - width / 2, top: cy - height / 2, width, height }, area.areaWidth, area.areaHeight, aspect));
  };
  const scalePct = area && box ? Math.round((box.width / area.areaWidth) * 100) : 100;

  async function generate() {
    if (!area || !box) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/compositions/${compositionId}/mockup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placement,
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
      if (!res.ok || !d.mockupUrl) throw new Error(d.error ?? "Mockup failed");
      setMockupUrl(d.mockupUrl);
      onSaved(d.mockupUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mockup failed");
    } finally {
      setBusy(false);
    }
  }

  const dispW = area ? area.areaWidth * scale : EDITOR_MAX;
  const dispH = area ? area.areaHeight * scale : EDITOR_MAX;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-bone/15 bg-ink-soft text-bone"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-bone/10 px-4 py-2">
          <span className="font-mono text-xs uppercase tracking-widest text-bone/60">Adjust size & placement</span>
          <button onClick={onClose} className="text-[11px] font-mono uppercase tracking-widest text-bone/50 hover:text-hazard">
            Close
          </button>
        </div>

        {/* Hidden loader to read the design's natural aspect ratio. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={designUrl}
          alt=""
          className="hidden"
          onLoad={(e) => {
            const el = e.currentTarget;
            if (el.naturalWidth && el.naturalHeight) setAspect(el.naturalWidth / el.naturalHeight);
          }}
        />

        <div className="grid min-h-0 flex-1 gap-4 overflow-auto p-4 md:grid-cols-2">
          {/* Left: interactive print-area editor */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center gap-2 self-start">
              <span className="text-[11px] font-mono uppercase tracking-widest text-bone/50">Placement</span>
              <select
                value={placement}
                onChange={(e) => switchPlacement(e.target.value)}
                className="rounded border border-bone/20 bg-ink px-2 py-1 text-xs text-bone focus:border-hazard focus:outline-none"
              >
                {areas.map((a) => (
                  <option key={a.placement} value={a.placement}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div
              className="relative touch-none rounded border border-dashed border-bone/30 bg-[repeating-conic-gradient(#2a2a2a_0%_25%,#222_0%_50%)] bg-[length:16px_16px]"
              style={{ width: dispW, height: dispH }}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
            >
              {box ? (
                <div
                  className="absolute cursor-move border border-hazard"
                  style={{
                    left: box.left * scale,
                    top: box.top * scale,
                    width: box.width * scale,
                    height: box.height * scale,
                  }}
                  onPointerDown={startDrag("move")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={designUrl} alt="design" className="pointer-events-none h-full w-full object-contain" draggable={false} />
                  <span
                    onPointerDown={startDrag("resize")}
                    className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-se-resize rounded-sm border border-hazard bg-hazard"
                  />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] font-mono uppercase tracking-widest text-bone/40">
                  {loaded ? "No print area" : "Loading…"}
                </div>
              )}
            </div>

            <div className="flex w-full items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-bone/50">Size</span>
              <input
                type="range"
                min={5}
                max={100}
                value={scalePct}
                onChange={(e) => setScalePct(Number(e.target.value))}
                className="flex-1 accent-hazard"
              />
              <span className="w-10 text-right text-xs tabular-nums text-bone/60">{scalePct}%</span>
            </div>
            <div className="flex w-full gap-2">
              <button
                onClick={() => setScalePct(100)}
                className="flex-1 rounded border border-bone/20 px-2 py-1.5 text-[10px] font-mono uppercase tracking-widest text-bone/70 hover:border-hazard hover:text-bone"
              >
                Fill width
              </button>
              <button
                onClick={recenter}
                className="flex-1 rounded border border-bone/20 px-2 py-1.5 text-[10px] font-mono uppercase tracking-widest text-bone/70 hover:border-hazard hover:text-bone"
              >
                Center
              </button>
            </div>
            <p className="self-start text-[10px] text-bone/40">
              Drag to move, drag the corner to resize. Box is clamped to the print area.
            </p>
          </div>

          {/* Right: true Printful mockup preview */}
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded border border-bone/10 bg-black/30 p-3">
            {mockupUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mockupUrl} alt="mockup" className="max-h-[50dvh] w-auto object-contain" />
            ) : (
              <p className="text-center text-xs text-bone/40">
                {busy ? "Rendering Printful mockup…" : "Set the size, then generate a real Printful mockup."}
              </p>
            )}
          </div>
        </div>

        {error ? <p className="px-4 text-xs text-hazard">{error}</p> : null}

        <div className="flex gap-2 border-t border-bone/10 p-3">
          <button
            disabled={busy || !box}
            onClick={generate}
            className="flex-1 rounded bg-hazard px-3 py-2 text-xs font-bold uppercase tracking-widest text-bone disabled:opacity-50"
          >
            {busy ? "Rendering…" : "Generate Printful mockup"}
          </button>
          <button
            onClick={onClose}
            className="rounded border border-bone/20 px-3 py-2 text-xs font-bold uppercase tracking-widest text-bone/70"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
