"use client";
import { useRef, useState } from "react";

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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("Read failed"));
    r.readAsDataURL(file);
  });
}

// Shared row: upload an image, or add a text graphic.
function DesignActions({
  onUpload,
  onText,
}: {
  onUpload: (dataUrl: string, name: string) => void | Promise<void>;
  onText: (text: string) => void | Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      await onUpload(dataUrl, file.name);
    } finally {
      setBusy(false);
    }
  }

  function handleText() {
    const text = typeof window !== "undefined" ? window.prompt("Text to turn into a design graphic:") : null;
    if (text && text.trim()) onText(text.trim());
  }

  return (
    <div className="flex gap-2">
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="flex-1 rounded border border-bone/20 px-2 py-2 text-[11px] font-mono uppercase tracking-widest text-bone/70 hover:border-hazard hover:text-bone disabled:opacity-50"
      >
        {busy ? "Uploading…" : "↑ Upload"}
      </button>
      <button
        onClick={handleText}
        className="flex-1 rounded border border-bone/20 px-2 py-2 text-[11px] font-mono uppercase tracking-widest text-bone/70 hover:border-hazard hover:text-bone"
      >
        Aa Text
      </button>
    </div>
  );
}

// Desktop side panel: description on top, input pinned at the bottom.
function SideForm({
  onSubmit,
  onUpload,
  onText,
}: {
  onSubmit: (p: string) => void | Promise<void>;
  onUpload: (dataUrl: string, name: string) => void | Promise<void>;
  onText: (text: string) => void | Promise<void>;
}) {
  const { prompt, setPrompt, pending, submit } = useChat(onSubmit);
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-3 text-xs text-bone/40">
        <p className="font-mono uppercase tracking-widest text-bone/60">Prompt a design</p>
        <p className="mt-2 leading-relaxed">
          Describe a graphic, upload your own image, or add text. It lands in the top bar, then tap it to drop
          onto the canvas. Select two designs and Combine to merge them.
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
        <div className="mt-2">
          <DesignActions onUpload={onUpload} onText={onText} />
        </div>
      </div>
    </div>
  );
}

// Mobile: full-screen panel (z above the bottom bar) with the input + Generate
// at the TOP, so the on-screen keyboard (bottom) never covers them.
function MobileChat({
  onSubmit,
  onUpload,
  onText,
  onClose,
}: {
  onSubmit: (p: string) => void | Promise<void>;
  onUpload: (dataUrl: string, name: string) => void | Promise<void>;
  onText: (text: string) => void | Promise<void>;
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
        <div className="mt-3">
          <DesignActions onUpload={onUpload} onText={onText} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 text-xs text-bone/40">
        <p className="leading-relaxed">
          Describe a graphic, upload your own image, or add text. It lands in the top bar — tap it to drop onto
          the canvas, then drag it onto a blank to make a composite. Select two designs and Combine to merge them.
        </p>
      </div>
    </div>
  );
}

export function ChatPanel({
  onSubmit,
  onUpload,
  onText,
  variant = "side",
}: {
  onSubmit: (p: string) => void | Promise<void>;
  onUpload: (dataUrl: string, name: string) => void | Promise<void>;
  onText: (text: string) => void | Promise<void>;
  variant?: "side" | "mobile";
}) {
  const [open, setOpen] = useState(false);

  if (variant === "side") {
    return (
      <div className="h-full">
        <SideForm onSubmit={onSubmit} onUpload={onUpload} onText={onText} />
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
      {open ? (
        <MobileChat onSubmit={onSubmit} onUpload={onUpload} onText={onText} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
