"use client";
import { useState } from "react";

function ChatForm({ onSubmit }: { onSubmit: (prompt: string) => void | Promise<void> }) {
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

export function ChatPanel({
  onSubmit,
  variant = "side",
}: {
  onSubmit: (prompt: string) => void | Promise<void>;
  variant?: "side" | "mobile";
}) {
  const [open, setOpen] = useState(false);

  if (variant === "side") {
    return (
      <div className="h-full">
        <ChatForm onSubmit={onSubmit} />
      </div>
    );
  }

  // Mobile: FAB → bottom sheet
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-20 rounded-full bg-hazard px-4 py-3 text-xs font-bold uppercase tracking-widest text-bone shadow-lg lg:hidden"
      >
        Chat
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-30 flex flex-col justify-end bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        >
          <div
            className="h-[60dvh] rounded-t-xl border-t border-bone/15 bg-ink-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end p-2">
              <button
                onClick={() => setOpen(false)}
                className="text-[11px] font-mono uppercase tracking-widest text-bone/50"
              >
                Close
              </button>
            </div>
            <ChatForm onSubmit={onSubmit} />
          </div>
        </div>
      ) : null}
    </>
  );
}
