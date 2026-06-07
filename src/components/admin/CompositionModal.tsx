"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlacementEditor } from "./PlacementEditor";

interface Comp {
  id: string;
  previewUrl: string | null;
  status: string;
  errorMessage: string | null;
  templateKey: string;
}

export function CompositionModal({
  compositionId,
  onClose,
  onDiscarded,
}: {
  compositionId: string;
  onClose: () => void;
  onDiscarded: (id: string) => void;
}) {
  const router = useRouter();
  const [comp, setComp] = useState<Comp | null>(null);
  const [busy, setBusy] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const productId = comp ? Number(comp.templateKey) : NaN;
  const canEdit = Number.isFinite(productId);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/compositions/${compositionId}`)
      .then((r) => r.json())
      .then((d) => {
        if (active) setComp((d.composition as Comp) ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [compositionId]);

  async function discard() {
    setBusy(true);
    try {
      await fetch(`/api/admin/compositions/${compositionId}`, { method: "DELETE" });
      onDiscarded(compositionId);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-bone/15 bg-ink-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-bone/10 px-4 py-2">
          <span className="text-xs font-mono uppercase tracking-widest text-bone/60">
            Composite{comp?.status ? ` · ${comp.status}` : ""}
          </span>
          <button onClick={onClose} className="text-[11px] font-mono uppercase tracking-widest text-bone/50">
            Close
          </button>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-black/30 p-4">
          {comp?.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={comp.previewUrl} alt="composite" className="max-h-[60dvh] w-auto object-contain" />
          ) : (
            <p className="text-sm text-bone/40">
              {comp?.status === "failed" ? comp.errorMessage ?? "Failed" : "Loading…"}
            </p>
          )}
        </div>
        <div className="flex gap-2 border-t border-bone/10 p-3">
          <button
            disabled={!canEdit}
            onClick={() => setEditorOpen(true)}
            title={canEdit ? "Resize and position the design on the product" : "Only catalog-product composites can be adjusted"}
            className="rounded border border-bone/20 px-3 py-2 text-xs font-bold uppercase tracking-widest text-bone/70 hover:border-hazard hover:text-bone disabled:opacity-40"
          >
            Adjust size &amp; placement
          </button>
          <button
            disabled={busy || !comp?.previewUrl}
            onClick={() => router.push(`/admin/compositions/${compositionId}/finalize`)}
            className="flex-1 rounded bg-hazard px-3 py-2 text-xs font-bold uppercase tracking-widest text-bone disabled:opacity-50"
          >
            Approve &amp; Finalize
          </button>
          <button
            disabled={busy}
            onClick={discard}
            className="rounded border border-bone/20 px-3 py-2 text-xs font-bold uppercase tracking-widest text-bone/70 disabled:opacity-50"
          >
            Discard
          </button>
        </div>
      </div>

      {editorOpen && comp && canEdit ? (
        <PlacementEditor
          compositionId={comp.id}
          onSaved={(mockupUrl) => setComp((c) => (c ? { ...c, previewUrl: mockupUrl, status: "draft" } : c))}
          onClose={() => setEditorOpen(false)}
        />
      ) : null}
    </div>
  );
}
