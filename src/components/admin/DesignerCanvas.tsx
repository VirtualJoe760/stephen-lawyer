"use client";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  useReactFlow,
  applyNodeChanges,
  type Node,
  type NodeChange,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { CatalogBlank } from "@/lib/printful/catalog";
import { TemplateNode } from "./nodes/TemplateNode";
import { DesignNode } from "./nodes/DesignNode";
import { CompositionNode } from "./nodes/CompositionNode";
import { LabelNode } from "./nodes/LabelNode";
import { TemplatesRail } from "./TemplatesRail";
import { DesignsHistoryBar } from "./DesignsHistoryBar";
import { ChatPanel } from "./ChatPanel";
import { CatalogueSwitcher } from "./CatalogueSwitcher";
import { CompositionModal } from "./CompositionModal";
import { DesignerToolbar, type ToolMode } from "./DesignerToolbar";
import { CombineDialog, type CombineTarget } from "./CombineDialog";
import { MergeDialog, type MergeTarget } from "./MergeDialog";
import { DesignPreviewModal } from "./DesignPreviewModal";

export interface CanvasNodeRow {
  id: string;
  kind: string;
  refId: string;
  x: number;
  y: number;
  scale: number;
  zIndex: number;
}
export interface DesignRow {
  id: string;
  thumbUrl: string;
  url: string;
  prompt: string;
  pending?: boolean;
}
export interface CatalogueRow {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  catalogue: CatalogueRow;
  catalogues: CatalogueRow[];
  initialNodes: CanvasNodeRow[];
  designs: DesignRow[];
  blanks: CatalogBlank[];
}

const nodeTypes: NodeTypes = {
  template: TemplateNode,
  design: DesignNode,
  composition: CompositionNode,
  label: LabelNode,
};

const SIZES = {
  template: { width: 130, height: 165 },
  design: { width: 130, height: 155 },
  composition: { width: 155, height: 185 },
};

function str(data: unknown, key: string): string {
  const v = (data as Record<string, unknown>)[key];
  return typeof v === "string" ? v : "";
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
const boxOf = (n: Node): Box => ({
  x: n.position.x,
  y: n.position.y,
  w: n.measured?.width ?? n.width ?? 130,
  h: n.measured?.height ?? n.height ?? 160,
});
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function rowToFlowNode(
  r: CanvasNodeRow,
  designs: DesignRow[],
  blanksById: Map<string, CatalogBlank>,
): Node {
  const position = { x: r.x, y: r.y };
  if (r.kind === "design") {
    const d = designs.find((x) => x.id === r.refId);
    return {
      id: r.id,
      type: "design",
      position,
      ...SIZES.design,
      data: { designId: r.refId, thumbUrl: d?.thumbUrl, prompt: d?.prompt },
    };
  }
  if (r.kind === "composition") {
    return {
      id: r.id,
      type: "composition",
      position,
      ...SIZES.composition,
      data: { compositionId: r.refId, status: "draft" },
    };
  }
  if (r.kind === "label") {
    return { id: r.id, type: "label", position, data: { text: r.refId } };
  }
  const b = blanksById.get(r.refId);
  return {
    id: r.id,
    type: "template",
    position,
    ...SIZES.template,
    data: { productId: r.refId, name: b?.name, image: b?.image },
  };
}

function flowNodeToRow(n: Node): CanvasNodeRow {
  const kind = n.type ?? "template";
  const refId =
    kind === "design"
      ? str(n.data, "designId")
      : kind === "composition"
        ? str(n.data, "compositionId")
        : kind === "label"
          ? str(n.data, "text")
          : str(n.data, "productId");
  return {
    id: n.id,
    kind,
    refId,
    x: Math.round(n.position.x),
    y: Math.round(n.position.y),
    scale: 100,
    zIndex: 0,
  };
}

function DesignerInner({ catalogue, catalogues, initialNodes, designs, blanks }: Props) {
  const rf = useReactFlow();
  const blanksById = useMemo(() => new Map(blanks.map((b) => [String(b.id), b])), [blanks]);
  const [nodes, setNodes] = useState<Node[]>(() =>
    initialNodes.map((r) => rowToFlowNode(r, designs, blanksById)),
  );
  const [designList, setDesignList] = useState<DesignRow[]>(designs);
  const [modalCompId, setModalCompId] = useState<string | null>(null);
  const [toolMode, setToolMode] = useState<ToolMode>("select");
  const [combineTarget, setCombineTarget] = useState<CombineTarget | null>(null);
  const [mergeTarget, setMergeTarget] = useState<MergeTarget | null>(null);
  const [previewDesign, setPreviewDesign] = useState<DesignRow | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(
    (next: Node[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const rows = next.map(flowNodeToRow).filter((r) => r.refId);
        fetch(`/api/admin/canvas/${catalogue.slug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodes: rows }),
        }).catch(() => {});
      }, 500);
    },
    [catalogue.slug],
  );

  const centerPosition = useCallback(() => {
    const el = typeof document !== "undefined" ? document.getElementById("designer-flow") : null;
    const rect = el?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : 400;
    const cy = rect ? rect.top + rect.height / 2 : 300;
    return rf.screenToFlowPosition({ x: cx, y: cy });
  }, [rf]);

  const addTemplate = useCallback(
    (blank: CatalogBlank) => {
      const node: Node = {
        id: crypto.randomUUID(),
        type: "template",
        position: centerPosition(),
        ...SIZES.template,
        data: { productId: String(blank.id), name: blank.name, image: blank.image },
      };
      setNodes((cur) => {
        const next = [...cur, node];
        persist(next);
        return next;
      });
    },
    [centerPosition, persist],
  );

  const addDesign = useCallback(
    (d: DesignRow) => {
      const node: Node = {
        id: crypto.randomUUID(),
        type: "design",
        position: centerPosition(),
        ...SIZES.design,
        data: { designId: d.id, thumbUrl: d.thumbUrl, prompt: d.prompt },
      };
      setNodes((cur) => {
        const next = [...cur, node];
        persist(next);
        return next;
      });
    },
    [centerPosition, persist],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((cur) => {
        const next = applyNodeChanges(changes, cur);
        if (changes.some((c) => c.type === "position" || c.type === "remove" || c.type === "dimensions"))
          persist(next);
        return next;
      });
    },
    [persist],
  );

  // Combine a design + product → a horizontal group: design + product = composite,
  // with "+"/"=" separators and an editable group-name label above.
  const combine = useCallback(
    async (target: CombineTarget, placement: string) => {
      const { design, template } = target;
      if (!design.designId || !template.productId) return;
      const COL = 175;
      const gx = template.position.x;
      const gy = template.position.y;
      const compositePos = { x: gx + 2 * COL, y: gy };
      const tempId = crypto.randomUUID();
      const nameId = crypto.randomUUID();
      const plusId = crypto.randomUUID();
      const eqId = crypto.randomUUID();
      const groupNum =
        nodes.filter((n) => n.type === "label" && !["+", "="].includes(str(n.data, "text"))).length + 1;

      setNodes((cur) => {
        const next = cur
          .map((n) => {
            if (n.id === design.nodeId) return { ...n, position: { x: gx, y: gy } };
            if (n.id === template.nodeId) return { ...n, position: { x: gx + COL, y: gy } };
            return n;
          })
          .concat([
            { id: nameId, type: "label", position: { x: gx, y: gy - 30 }, data: { text: `Group ${groupNum}` } },
            { id: plusId, type: "label", position: { x: gx + 134, y: gy + 64 }, data: { text: "+" } },
            { id: eqId, type: "label", position: { x: gx + COL + 134, y: gy + 64 }, data: { text: "=" } },
            {
              id: tempId,
              type: "composition",
              position: compositePos,
              ...SIZES.composition,
              data: { compositionId: "", status: "generating" },
            },
          ]);
        persist(next);
        return next;
      });

      try {
        const res = await fetch("/api/admin/compositions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            catalogueId: catalogue.id,
            designId: design.designId,
            templateKey: template.productId,
            mockupUrl: template.image,
            placement,
            x: Math.round(compositePos.x),
            y: Math.round(compositePos.y),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          composition?: { id: string; status: string; previewUrl: string | null };
          error?: string;
        };
        const comp = data.composition;
        if (!comp) throw new Error(data.error ?? "Composition failed");
        setNodes((cur) => {
          const next = cur.map((n) =>
            n.id === tempId
              ? { ...n, data: { compositionId: comp.id, status: comp.status, previewUrl: comp.previewUrl } }
              : n,
          );
          persist(next);
          return next;
        });
      } catch (e) {
        setNodes((cur) =>
          cur.map((n) => (n.id === tempId ? { ...n, data: { compositionId: "", status: "failed" } } : n)),
        );
        if (typeof window !== "undefined") window.alert(e instanceof Error ? e.message : "Composition failed");
      }
    },
    [catalogue.id, persist, nodes],
  );

  // Drag a design onto a template → open the placement modal (where/all-over).
  const onNodeDragStop = useCallback(
    (_e: unknown, dragged: Node) => {
      if (dragged.type !== "design") return;
      const all = rf.getNodes();
      const dBox = boxOf(dragged);
      const tpl = all.find((n) => n.type === "template" && overlaps(dBox, boxOf(n)));
      if (tpl) {
        setCombineTarget({
          design: { designId: str(dragged.data, "designId"), nodeId: dragged.id },
          template: {
            productId: str(tpl.data, "productId"),
            name: str(tpl.data, "name"),
            image: str(tpl.data, "image"),
            nodeId: tpl.id,
            position: { x: tpl.position.x, y: tpl.position.y },
          },
        });
      }
    },
    [rf],
  );

  const onNodeClick = useCallback(
    (e: React.MouseEvent, node: Node) => {
      if (node.type === "composition") {
        const compId = str(node.data, "compositionId");
        if (compId) setModalCompId(compId);
        return;
      }
      // Plain click previews; modifier-click is reserved for multi-select (merge).
      if (node.type === "design" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const id = str(node.data, "designId");
        const d = designList.find((x) => x.id === id);
        if (d?.url) setPreviewDesign(d);
      }
    },
    [designList],
  );

  const onDiscarded = useCallback(
    (compId: string) => {
      setNodes((cur) => {
        const next = cur.filter((n) => !(n.type === "composition" && str(n.data, "compositionId") === compId));
        persist(next);
        return next;
      });
    },
    [persist],
  );

  // Toolbar "Combine" — context-aware:
  //  • a design + a template  → placement dialog → composite group
  //  • two designs            → merge dialog → new merged design
  const onCombine = useCallback(() => {
    const sel = rf.getNodes().filter((n) => n.selected);
    const design = sel.find((n) => n.type === "design");
    const template = sel.find((n) => n.type === "template");
    if (design && template) {
      setCombineTarget({
        design: { designId: str(design.data, "designId"), nodeId: design.id },
        template: {
          productId: str(template.data, "productId"),
          name: str(template.data, "name"),
          image: str(template.data, "image"),
          nodeId: template.id,
          position: { x: template.position.x, y: template.position.y },
        },
      });
      return;
    }
    const designSel = sel.filter((n) => n.type === "design");
    if (designSel.length >= 2) {
      const [a, b] = designSel;
      setMergeTarget({
        a: { designId: str(a.data, "designId"), thumbUrl: str(a.data, "thumbUrl") || undefined },
        b: { designId: str(b.data, "designId"), thumbUrl: str(b.data, "thumbUrl") || undefined },
      });
    }
  }, [rf]);

  const canCombine = useMemo(() => {
    const sel = nodes.filter((n) => n.selected);
    const hasDesign = sel.some((n) => n.type === "design");
    const hasTemplate = sel.some((n) => n.type === "template");
    const designCount = sel.filter((n) => n.type === "design").length;
    return (hasDesign && hasTemplate) || designCount >= 2;
  }, [nodes]);

  // Shared: show a pending tile, run a request that returns { design }, then
  // swap the tile for the real design (or drop it on failure).
  const runDesignJob = useCallback(async (label: string, fetcher: () => Promise<Response>) => {
    const tempId = crypto.randomUUID();
    setDesignList((cur) => [{ id: tempId, thumbUrl: "", url: "", prompt: label, pending: true }, ...cur]);
    try {
      const res = await fetcher();
      const data = (await res.json().catch(() => ({}))) as {
        design?: { id: string; thumbUrl: string; url: string; prompt: string };
        error?: string;
      };
      if (!res.ok || !data.design) throw new Error(data.error ?? "Failed");
      const real = data.design;
      setDesignList((cur) => cur.map((d) => (d.id === tempId ? { ...real } : d)));
    } catch (e) {
      setDesignList((cur) => cur.filter((d) => d.id !== tempId));
      if (typeof window !== "undefined") window.alert(e instanceof Error ? e.message : "Failed");
    }
  }, []);

  const onPrompt = useCallback(
    (prompt: string) =>
      runDesignJob(prompt, () =>
        fetch("/api/admin/designs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ catalogueId: catalogue.id, prompt }),
        }),
      ),
    [catalogue.id, runDesignJob],
  );

  // "Aa Text" → generate a lettering graphic from the typed text.
  const onText = useCallback(
    (text: string) =>
      onPrompt(
        `The words "${text}" as a bold, high-contrast lettering graphic with clean typography, ` +
          "centered, transparent background, suitable for printing on apparel.",
      ),
    [onPrompt],
  );

  // Upload your own image → stored as a design like a generated one.
  const onUpload = useCallback(
    (dataUrl: string, name: string) =>
      runDesignJob(name || "Uploaded image", () =>
        fetch("/api/admin/designs/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ catalogueId: catalogue.id, dataUrl, name }),
        }),
      ),
    [catalogue.id, runDesignJob],
  );

  // Merge two designs into a new one via a "collision" prompt.
  const onMerge = useCallback(
    (t: MergeTarget, prompt: string) =>
      runDesignJob("Merge", () =>
        fetch("/api/admin/designs/merge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            catalogueId: catalogue.id,
            designAId: t.a.designId,
            designBId: t.b.designId,
            prompt,
          }),
        }),
      ),
    [catalogue.id, runDesignJob],
  );

  return (
    <div className="flex h-[100dvh] flex-col bg-ink text-bone pb-14 lg:pb-0">
      <header className="border-b border-bone/10">
        <div className="flex items-center gap-3 px-3 py-2">
          <Link
            href="/admin"
            className="shrink-0 text-xs font-mono uppercase tracking-widest text-bone/60 hover:text-hazard"
            title="Back to admin dashboard"
          >
            ‹ Admin
          </Link>
          <CatalogueSwitcher current={catalogue} catalogues={catalogues} />
          {/* Desktop: designs inline in the navbar. */}
          <div className="hidden min-w-0 flex-1 lg:block">
            <DesignsHistoryBar designs={designList} onAdd={addDesign} />
          </div>
          <div className="flex-1 lg:hidden" />
          <Link
            href="/"
            className="shrink-0 text-xs font-mono uppercase tracking-widest text-bone/60 hover:text-hazard"
            title="View storefront"
          >
            Store ↗
          </Link>
        </div>
        {/* Mobile: designs history on its own full-width row below the navbar. */}
        <div className="border-t border-bone/10 px-3 py-1.5 lg:hidden">
          <DesignsHistoryBar designs={designList} onAdd={addDesign} />
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <aside className="hidden w-48 shrink-0 overflow-y-auto border-r border-bone/10 p-2 lg:block">
          <TemplatesRail blanks={blanks} onAdd={addTemplate} />
        </aside>

        <div id="designer-flow" className="relative min-w-0 flex-1">
          <DesignerToolbar mode={toolMode} onMode={setToolMode} onCombine={onCombine} canCombine={canCombine} />
          <ReactFlow
            nodes={nodes}
            onNodesChange={onNodesChange}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            nodesConnectable={false}
            selectionOnDrag={toolMode === "box"}
            panOnDrag={toolMode === "box" ? [1, 2] : true}
            fitView
            minZoom={0.2}
            maxZoom={2}
            colorMode="dark"
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#2a2a2a" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        <aside className="hidden w-72 shrink-0 border-l border-bone/10 lg:block">
          <ChatPanel onSubmit={onPrompt} onUpload={onUpload} onText={onText} variant="side" />
        </aside>
      </div>

      {/* Mobile templates dock (horizontal scroll only) */}
      <div className="border-t border-bone/10 p-2 lg:hidden">
        <TemplatesRail blanks={blanks} onAdd={addTemplate} orientation="horizontal" />
      </div>

      {/* Mobile chat */}
      <ChatPanel onSubmit={onPrompt} onUpload={onUpload} onText={onText} variant="mobile" />

      {modalCompId ? (
        <CompositionModal
          compositionId={modalCompId}
          onClose={() => setModalCompId(null)}
          onDiscarded={onDiscarded}
        />
      ) : null}

      {combineTarget ? (
        <CombineDialog
          target={combineTarget}
          onCancel={() => setCombineTarget(null)}
          onConfirm={(placement) => {
            const t = combineTarget;
            setCombineTarget(null);
            if (t) combine(t, placement);
          }}
        />
      ) : null}

      {mergeTarget ? (
        <MergeDialog
          target={mergeTarget}
          onCancel={() => setMergeTarget(null)}
          onConfirm={(prompt) => {
            const t = mergeTarget;
            setMergeTarget(null);
            if (t) onMerge(t, prompt);
          }}
        />
      ) : null}

      {previewDesign ? (
        <DesignPreviewModal
          url={previewDesign.url}
          prompt={previewDesign.prompt}
          onClose={() => setPreviewDesign(null)}
          onAdd={() => addDesign(previewDesign)}
        />
      ) : null}
    </div>
  );
}

export default function DesignerCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <DesignerInner {...props} />
    </ReactFlowProvider>
  );
}
