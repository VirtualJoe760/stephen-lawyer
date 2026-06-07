"use client";
import { TEMPLATES } from "@/lib/printful/templates";

export function TemplatesRail({
  onAdd,
  orientation = "vertical",
}: {
  onAdd: (key: string) => void;
  orientation?: "vertical" | "horizontal";
}) {
  const horizontal = orientation === "horizontal";
  return (
    <div className={horizontal ? "flex gap-2 overflow-x-auto pb-1" : "flex flex-col gap-2"}>
      {TEMPLATES.map((t) => (
        <button
          key={t.key}
          onClick={() => onAdd(t.key)}
          title={`Add ${t.name}`}
          className={`shrink-0 rounded-md border border-bone/15 bg-ink-soft p-2 text-left transition-colors hover:border-hazard ${
            horizontal ? "w-28" : "w-full"
          }`}
        >
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded bg-bone/5">
            {t.mockupUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.mockupUrl} alt={t.name} className="h-full w-full object-contain" draggable={false} />
            ) : (
              <span className="text-[10px] font-mono uppercase tracking-widest text-bone/40">Tap to add</span>
            )}
          </div>
          <p className="mt-1 truncate text-[11px] font-mono uppercase tracking-wide text-bone/80">
            {t.name}
          </p>
        </button>
      ))}
    </div>
  );
}
