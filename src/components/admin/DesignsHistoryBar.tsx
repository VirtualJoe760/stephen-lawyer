"use client";
import type { DesignRow } from "./DesignerCanvas";

export function DesignsHistoryBar({
  designs,
  onAdd,
}: {
  designs: DesignRow[];
  onAdd: (d: DesignRow) => void;
}) {
  if (!designs.length) {
    return (
      <p className="truncate text-[11px] font-mono uppercase tracking-widest text-bone/30">
        No designs yet — prompt one in chat
      </p>
    );
  }
  return (
    <div className="flex gap-2 overflow-x-auto">
      {designs.map((d) =>
        d.pending ? (
          <div
            key={d.id}
            title={d.prompt}
            className="flex h-12 w-12 shrink-0 animate-pulse items-center justify-center rounded border border-bone/15 bg-bone/10 text-[8px] font-mono uppercase text-bone/40"
          >
            …
          </div>
        ) : (
          <button
            key={d.id}
            onClick={() => onAdd(d)}
            title={d.prompt}
            className="h-12 w-12 shrink-0 overflow-hidden rounded border border-bone/15 hover:border-hazard"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.thumbUrl} alt={d.prompt} className="h-full w-full object-cover" draggable={false} />
          </button>
        ),
      )}
    </div>
  );
}
