"use client";
import { useState } from "react";

function useChat(onSubmit: (p: string) => void | Promise<void>) {
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  async function submit() {
    const p = prompt.trim();
    if (!p || pending) return;
    setPending(true);
    try {
      await onSubmit(p);
      setPrompt("");
    } finally {
      setPending(false);
    }
  }
  return { prompt, setPrompt, pending, submit };
}

// Desktop side panel: description on top, input pinned at the bottom.
function SideForm({ onSubmit }: { onSubmit: (p: string) => void | Promise<void> }) {
  const { prompt, setPrompt, pending, submit } = useChat(onSubmit);
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-3 text-xs text-bone/40">
        <p className="font-mono uppercase tracking-widest text-bone/60">Prompt a design</p>
        <p className="mt-2 leading-relaxed">
          Describe a graphic. It generates, lands in the top bar, then tap it to drop onto the canvas.
        </p>
      </div>
      <div className="border-t border-bone/10 p-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          rows={3}
          placeholder="e.g. tri-color camo skull, transparent background"
          className="w-full resize-none rounded border border-bone/20 bg-ink px-2 py-1 text-sm text-bone placeholder:text-bone/30 focus:border-hazard focus:outline-none"
        />
        <button
          onClick={submit}
          disabled={pending}
          className="mt-2 w-full rounded bg-hazard px-3 py-2 text-xs font-bold uppercase tracking-widest text-bone disabled:opacity-50"
        >
          {pending ? "Generating…" : "Generate"}
        </button>
      </div>
    </div>
  );
}

// Mobile: full-screen panel (z above the bottom bar) with the input + Generate
// at the TOP, so the on-screen keyboard (bottom) never covers them.
function MobileChat({
  onSubmit,
  onClose,
}: {
  onSubmit: (p: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const { prompt, setPrompt, pending, submit } = useChat(onSubmit);
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink lg:hidden">
      <div className="flex items-center justify-between border-b border-bone/10 p-3">
        <span className="font-mono text-xs uppercase tracking-widest text-bone/60">Prompt a design</span>
        <button onClick={onClose} className="text-[11px] font-mono uppercase tracking-widest text-bone/50">
          Close
        </button>
      </div>
      <div className="p-3">
        <textarea
          autoFocus
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="e.g. tri-color camo skull, transparent background"
          className="w-full resize-none rounded border border-bone/20 bg-ink px-3 py-2 text-bone placeholder:text-bone/30 focus:border-hazard focus:outline-none"
        />
        <button
          onClick={async () => {
            await submit();
            onClose();
          }}
          disabled={pending}
          className="mt-3 w-full rounded bg-hazard px-3 py-3 text-sm font-bold uppercase tracking-widest text-bone disabled:opacity-50"
        >
          {pending ? "Generating…" : "Generate"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 text-xs text-bone/40">
        <p className="leading-relaxed">
          Describe a graphic for direct-to-garment printing. It lands in the top bar — tap it to drop onto the
          canvas, then drag it onto a blank to make a composite. Solid or transparent background works best.
        </p>
      </div>
    </div>
  );
}

export function ChatPanel({
  onSubmit,
  variant = "side",
}: {
  onSubmit: (p: string) => void | Promise<void>;
  variant?: "side" | "mobile";
}) {
  const [open, setOpen] = useState(false);

  if (variant === "side") {
    return (
      <div className="h-full">
        <SideForm onSubmit={onSubmit} />
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-16 right-4 z-50 rounded-full bg-hazard px-4 py-3 text-xs font-bold uppercase tracking-widest text-bone shadow-lg lg:hidden"
      >
        Chat
      </button>
      {open ? <MobileChat onSubmit={onSubmit} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
