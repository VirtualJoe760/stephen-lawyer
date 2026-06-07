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
import { GroupNode } from "./nodes/GroupNode";
import { TemplatesRail } from "./TemplatesRail";
import { DesignsHistoryBar } from "./DesignsHistoryBar";
import { ChatPanel, type DesignOptions } from "./ChatPanel";
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
  groupId?: string | null;
  x: number;
  y: number;
  width?: number | null;
  height?: number | null;
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
export interface CompositionRow {
  id: string;
  status: "generating" | "draft" | "approved" | "published" | "failed";
  previewUrl: string | null;
}

interface Props {
  catalogue: CatalogueRow;
  catalogues: CatalogueRow[];
  initialNodes: CanvasNodeRow[];
  designs: DesignRow[];
  compositions: CompositionRow[];
  blanks: CatalogBlank[];
}

const nodeTypes: NodeTypes = {
  template: TemplateNode,
  design: DesignNode,
  composition: CompositionNode,
  label: LabelNode,
  group: GroupNode,
};

const GROUP_PAD = 16;

// Bounding box (with padding) around a set of member nodes, in flow coords.
function groupBoxOf(members: Node[], pad = GROUP_PAD) {
  const boxes = members.map(boxOf);
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.w));
  const maxY = Math.max(...boxes.map((b) => b.y + b.h));
  return { x: minX - pad, y: minY - pad, width: maxX - minX + 2 * pad, height: maxY - minY + 2 * pad };
}

// Resize/reposition each group node to wrap its current members.
function reflowGroups(nodes: Node[]): Node[] {
  return nodes.map((n) => {
    if (n.type !== "group") return n;
    const members = nodes.filter((m) => m.type !== "group" && str(m.data, "groupId") === n.id);
    if (!members.length) return n;
    const b = groupBoxOf(members);
    return { ...n, position: { x: b.x, y: b.y }, width: b.width, height: b.height };
  });
}

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
  compositionsById: Map<string, CompositionRow>,
): Node {
  const position = { x: r.x, y: r.y };
  const sizeOverride = r.width && r.height ? { width: r.width, height: r.height } : null;
  const gid = r.groupId ?? undefined;
  if (r.kind === "group") {
    return {
      id: r.id,
      type: "group",
      position,
      width: r.width ?? 200,
      height: r.height ?? 200,
      data: { name: r.refId, groupId: r.id },
      dragHandle: ".group-handle",
      selectable: false,
      zIndex: 0,
    };
  }
  if (r.kind === "design") {
    const d = designs.find((x) => x.id === r.refId);
    return {
      id: r.id,
      type: "design",
      position,
      ...(sizeOverride ?? SIZES.design),
      zIndex: 1,
      data: { designId: r.refId, thumbUrl: d?.thumbUrl, prompt: d?.prompt, groupId: gid },
    };
  }
  if (r.kind === "composition") {
    const c = compositionsById.get(r.refId);
    return {
      id: r.id,
      type: "composition",
      position,
      ...(sizeOverride ?? SIZES.composition),
      zIndex: 1,
      data: { compositionId: r.refId, status: c?.status ?? "draft", previewUrl: c?.previewUrl ?? null, groupId: gid },
    };
  }
  if (r.kind === "label") {
    return { id: r.id, type: "label", position, zIndex: 1, data: { text: r.refId } };
  }
  const b = blanksById.get(r.refId);
  return {
    id: r.id,
    type: "template",
    position,
    ...(sizeOverride ?? SIZES.template),
    zIndex: 1,
    data: { productId: r.refId, name: b?.name, image: b?.image, groupId: gid },
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
          : kind === "group"
            ? str(n.data, "name")
            : str(n.data, "productId");
  const w = n.width ?? n.measured?.width ?? null;
  const h = n.height ?? n.measured?.height ?? null;
  return {
    id: n.id,
    kind,
    refId,
    groupId: kind === "group" ? null : str(n.data, "groupId") || null,
    x: Math.round(n.position.x),
    y: Math.round(n.position.y),
    width: w ? Math.round(w) : null,
    height: h ? Math.round(h) : null,
    scale: 100,
    zIndex: kind === "group" ? 0 : 1,
  };
}

function DesignerInner({ catalogue, catalogues, initialNodes, designs, compositions, blanks }: Props) {
  const rf = useReactFlow();
  const blanksById = useMemo(() => new Map(blanks.map((b) => [String(b.id), b])), [blanks]);
  const compositionsById = useMemo(
    () => new Map(compositions.map((c) => [c.id, c])),
    [compositions],
  );
  const [nodes, setNodes] = useState<Node[]>(() =>
    initialNodes
      // Drop legacy "+"/"=" separator labels saved by earlier versions.
      .filter((r) => !(r.kind === "label" && (r.refId === "+" || r.refId === "=")))
      .map((r) => rowToFlowNode(r, designs, blanksById, compositionsById)),
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
        // Removing a group node un-groups its members (they stay on the canvas).
        const removedGroupIds = changes
          .filter((c) => c.type === "remove")
          .map((c) => (c as { id: string }).id)
          .filter((id) => cur.find((n) => n.id === id && n.type === "group"));
        let next = applyNodeChanges(changes, cur);
        if (removedGroupIds.length) {
          next = next.map((n) =>
            removedGroupIds.includes(str(n.data, "groupId"))
              ? { ...n, data: { ...n.data, groupId: undefined } }
              : n,
          );
        }
        if (changes.some((c) => c.type === "position" || c.type === "remove" || c.type === "dimensions"))
          persist(next);
        return next;
      });
    },
    [persist],
  );

  // Dragging a group's header moves all its members together.
  const groupDrag = useRef<{ id: string; sx: number; sy: number; members: Map<string, { x: number; y: number }> } | null>(null);
  const onNodeDragStart = useCallback(
    (_e: unknown, node: Node) => {
      if (node.type !== "group") return;
      const members = new Map<string, { x: number; y: number }>();
      for (const n of rf.getNodes()) {
        if (str(n.data, "groupId") === node.id) members.set(n.id, { x: n.position.x, y: n.position.y });
      }
      groupDrag.current = { id: node.id, sx: node.position.x, sy: node.position.y, members };
    },
    [rf],
  );
  const onNodeDrag = useCallback((_e: unknown, node: Node) => {
    const g = groupDrag.current;
    if (!g || node.id !== g.id) return;
    const dx = node.position.x - g.sx;
    const dy = node.position.y - g.sy;
    setNodes((cur) =>
      cur.map((n) => {
        const s = g.members.get(n.id);
        return s ? { ...n, position: { x: s.x + dx, y: s.y + dy } } : n;
      }),
    );
  }, []);

  // Combine a design + product → a horizontal group (design, product, composite)
  // with an editable group-name label above.
  const combine = useCallback(
    async (target: CombineTarget, placement: string) => {
      const { design, template } = target;
      if (!design.designId || !template.productId) return;
      const COL = 175;
      const gx = template.position.x;
      const gy = template.position.y;
      const compositePos = { x: gx + 2 * COL, y: gy };
      const tempId = crypto.randomUUID();
      const groupId = crypto.randomUUID();
      const groupNum = nodes.filter((n) => n.type === "group").length + 1;

      setNodes((cur) => {
        const members = cur
          .map((n) => {
            if (n.id === design.nodeId)
              return { ...n, position: { x: gx, y: gy }, zIndex: 1, data: { ...n.data, groupId } };
            if (n.id === template.nodeId)
              return { ...n, position: { x: gx + COL, y: gy }, zIndex: 1, data: { ...n.data, groupId } };
            return n;
          })
          .concat([
            {
              id: tempId,
              type: "composition",
              position: compositePos,
              ...SIZES.composition,
              zIndex: 1,
              data: { compositionId: "", status: "generating", groupId },
            },
          ]);
        // Group container wrapping the three members.
        const groupMembers = members.filter((n) => str(n.data, "groupId") === groupId);
        const box = groupBoxOf(groupMembers);
        const groupNode: Node = {
          id: groupId,
          type: "group",
          position: { x: box.x, y: box.y },
          width: box.width,
          height: box.height,
          data: { name: `Group ${groupNum}`, groupId },
          dragHandle: ".group-handle",
          selectable: false,
          zIndex: 0,
        };
        const next = [groupNode, ...members];
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
              ? { ...n, data: { ...n.data, compositionId: comp.id, status: comp.status, previewUrl: comp.previewUrl } }
              : n,
          );
          persist(next);
          return next;
        });
      } catch (e) {
        setNodes((cur) =>
          cur.map((n) => (n.id === tempId ? { ...n, data: { ...n.data, compositionId: "", status: "failed" } } : n)),
        );
        if (typeof window !== "undefined") window.alert(e instanceof Error ? e.message : "Composition failed");
      }
    },
    [catalogue.id, persist, nodes],
  );

  // Drag a design onto a template → placement modal (where/all-over).
  // Drag a design onto another design → merge modal (collision prompt).
  // Any other drag → reflow group boxes to fit their members.
  const reflowAndPersist = useCallback(() => {
    setNodes((cur) => {
      const next = reflowGroups(cur);
      persist(next);
      return next;
    });
  }, [persist]);

  const onNodeDragStop = useCallback(
    (_e: unknown, dragged: Node) => {
      const wasGroup = groupDrag.current?.id === dragged.id;
      groupDrag.current = null;
      if (!wasGroup && dragged.type === "design") {
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
          return;
        }
        const other = all.find((n) => n.type === "design" && n.id !== dragged.id && overlaps(dBox, boxOf(n)));
        if (other) {
          setMergeTarget({
            a: { designId: str(dragged.data, "designId"), thumbUrl: str(dragged.data, "thumbUrl") || undefined },
            b: { designId: str(other.data, "designId"), thumbUrl: str(other.data, "thumbUrl") || undefined },
          });
          return;
        }
      }
      reflowAndPersist();
    },
    [rf, reflowAndPersist],
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
    (prompt: string, opts: DesignOptions) =>
      runDesignJob(prompt, () =>
        fetch("/api/admin/designs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            catalogueId: catalogue.id,
            prompt,
            background: opts.background,
            aspectRatio: opts.aspectRatio,
          }),
        }),
      ),
    [catalogue.id, runDesignJob],
  );

  // "Aa Text" → generate a lettering graphic from the typed text (+ optional style).
  // Lettering is always transparent so it drops cleanly onto garments.
  const onText = useCallback(
    (text: string, style: string) =>
      onPrompt(
        `The words "${text}" as a bold, high-contrast lettering graphic with clean typography` +
          (style ? `, ${style} style` : "") +
          ", centered, transparent background, suitable for printing on apparel.",
        { background: "transparent", aspectRatio: "1:1" },
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
            onNodeDragStart={onNodeDragStart}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            nodesConnectable={false}
            multiSelectionKeyCode={["Control", "Meta"]}
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
