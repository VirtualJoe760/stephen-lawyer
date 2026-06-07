"use client";

// Full-screen preview of a single design graphic.
export function DesignPreviewModal({
  url,
  prompt,
  onClose,
  onAdd,
}: {
  url: string;
  prompt?: string;
  onClose: () => void;
  onAdd?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90 p-4" onClick={onClose}>
      <div className="flex items-center justify-between">
        <span className="truncate font-mono text-xs uppercase tracking-widest text-bone/60">
          {prompt ?? "Design"}
        </span>
        <button onClick={onClose} className="text-[11px] font-mono uppercase tracking-widest text-bone/60 hover:text-hazard">
          Close
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center py-4" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={prompt ?? "design"} className="max-h-full max-w-full object-contain" />
      </div>
      {onAdd ? (
        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              onAdd();
              onClose();
            }}
            className="rounded bg-hazard px-4 py-2 text-xs font-bold uppercase tracking-widest text-bone"
          >
            Add to canvas
          </button>
        </div>
      ) : null}
    </div>
  );
}
