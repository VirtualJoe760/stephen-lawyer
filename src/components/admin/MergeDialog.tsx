"use client";
import { useState } from "react";

export interface MergeTarget {
  a: { designId: string; thumbUrl?: string };
  b: { designId: string; thumbUrl?: string };
}

// Prompt for how two selected designs should "collide" into one new design.
export function MergeDialog({
  target,
  onCancel,
  onConfirm,
}: {
  target: MergeTarget;
  onCancel: () => void;
  onConfirm: (prompt: string) => void;
}) {
  const [prompt, setPrompt] = useState("");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-lg border border-bone/15 bg-ink-soft p-4 text-bone"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-mono text-xs uppercase tracking-widest text-bone/60">Merge two designs</p>

        <div className="mt-3 flex items-center justify-center gap-3">
          {[target.a, target.b].map((d, i) => (
            <div key={i} className="flex items-center gap-3">
              {i === 1 ? <span className="text-2xl font-bold text-bone/40">+</span> : null}
              <div className="h-20 w-20 overflow-hidden rounded border border-bone/20 bg-bone/5">
                {d.thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.thumbUrl} alt="design" className="h-full w-full object-cover" />
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <label className="mt-4 block text-[11px] font-mono uppercase tracking-widest text-bone/50">
          How should they collide?
        </label>
        <textarea
          autoFocus
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="e.g. fuse the skull into the flames, single centered emblem"
          className="mt-1 w-full resize-none rounded border border-bone/20 bg-ink px-2 py-1.5 text-sm text-bone placeholder:text-bone/30 focus:border-hazard focus:outline-none"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded px-3 py-2 text-xs font-mono uppercase tracking-widest text-bone/50 hover:text-bone"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(prompt.trim())}
            className="rounded bg-hazard px-4 py-2 text-xs font-bold uppercase tracking-widest text-bone"
          >
            Merge
          </button>
        </div>
      </div>
    </div>
  );
}
