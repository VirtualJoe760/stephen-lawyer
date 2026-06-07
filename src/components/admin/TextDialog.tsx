"use client";
import { useState } from "react";

// Inline dialog for the "Aa Text" design — replaces a blocking window.prompt.
export function TextDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (text: string, style: string) => void;
}) {
  const [text, setText] = useState("");
  const [style, setStyle] = useState("");

  const submit = () => {
    const t = text.trim();
    if (t) onConfirm(t, style.trim());
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-lg border border-bone/15 bg-ink-soft p-4 text-bone"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-mono text-xs uppercase tracking-widest text-bone/60">Add a text design</p>

        <label className="mt-3 block text-[11px] font-mono uppercase tracking-widest text-bone/50">Text</label>
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="STEPHEN LAWYER"
          className="mt-1 w-full rounded border border-bone/20 bg-ink px-2 py-1.5 text-sm text-bone placeholder:text-bone/30 focus:border-hazard focus:outline-none"
        />

        <label className="mt-3 block text-[11px] font-mono uppercase tracking-widest text-bone/50">
          Style <span className="text-bone/30">(optional)</span>
        </label>
        <input
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="e.g. dripping graffiti, chrome, varsity"
          className="mt-1 w-full rounded border border-bone/20 bg-ink px-2 py-1.5 text-sm text-bone placeholder:text-bone/30 focus:border-hazard focus:outline-none"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded px-3 py-2 text-xs font-mono uppercase tracking-widest text-bone/50 hover:text-bone"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="rounded bg-hazard px-4 py-2 text-xs font-bold uppercase tracking-widest text-bone disabled:opacity-50"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}
