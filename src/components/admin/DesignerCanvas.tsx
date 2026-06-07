"use client";
import { useCallback, useRef, useState } from "react";
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
import { TemplateNode } from "./nodes/TemplateNode";
import { DesignNode } from "./nodes/DesignNode";
import { CompositionNode } from "./nodes/CompositionNode";
import { TemplatesRail } from "./TemplatesRail";
import { DesignsHistoryBar } from "./DesignsHistoryBar";
import { ChatPanel } from "./ChatPanel";
import { CatalogueSwitcher } from "./CatalogueSwitcher";
import { CompositionModal } from "./CompositionModal";

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
}

const nodeTypes: NodeTypes = {
  template: TemplateNode,
  design: DesignNode,
  composition: CompositionNode,
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
function boxOf(n: Node): Box {
  return {
    x: n.position.x,
    y: n.position.y,
    w: n.measured?.width ?? 160,
    h: n.measured?.height ?? 160,
  };
}
function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function rowToFlowNode(r: CanvasNodeRow, designs: DesignRow[]): Node {
  const position = { x: r.x, y: r.y };
  if (r.kind === "design") {
    const d = designs.find((x) => x.id === r.refId);
    return {
      id: r.id,
      type: "design",
      position,
      data: { designId: r.refId, thumbUrl: d?.thumbUrl, prompt: d?.prompt },
    };
  }
  if (r.kind === "composition") {
    return { id: r.id, type: "composition", position, data: { compositionId: r.refId, status: "draft" } };
  }
  return { id: r.id, type: "template", position, data: { templateKey: r.refId } };
}

function flowNodeToRow(n: Node): CanvasNodeRow {
  const kind = n.type ?? "template";
  const refId =
    kind === "design"
      ? str(n.data, "designId")
      : kind === "composition"
        ? str(n.data, "compositionId")
        : str(n.data, "templateKey");
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

function DesignerInner({ catalogue, catalogues, initialNodes, designs }: Props) {
  const rf = useReactFlow();
  const [nodes, setNodes] = useState<Node[]>(() => initialNodes.map((r) => rowToFlowNode(r, designs)));
  const [designList, setDesignList] = useState<DesignRow[]>(designs);
  const [modalCompId, setModalCompId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(
    (next: Node[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const rows = next.map(flowNodeToRow).filter((r) => r.refId); // skip in-flight skeletons
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
    (key: string) => {
      const node: Node = {
        id: crypto.randomUUID(),
        type: "template",
        position: centerPosition(),
        data: { templateKey: key },
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
        if (changes.some((c) => c.type === "position" || c.type === "remove")) persist(next);
        return next;
      });
    },
    [persist],
  );

  // Drag a DesignNode onto a TemplateNode → fire a composition.
  const createComposition = useCallback(
    async (designId: string, templateKey: string, position: { x: number; y: number }) => {
      if (!designId || !templateKey) return;
      const tempId = crypto.randomUUID();
      const skeleton: Node = {
        id: tempId,
        type: "composition",
        position,
        data: { compositionId: "", status: "generating" },
      };
      setNodes((cur) => [...cur, skeleton]);
      try {
        const res = await fetch("/api/admin/compositions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            catalogueId: catalogue.id,
            designId,
            templateKey,
            x: Math.round(position.x),
            y: Math.round(position.y),
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
    [catalogue.id, persist],
  );

  const onNodeDragStop = useCallback(
    (_e: unknown, dragged: Node) => {
      if (dragged.type !== "design") return;
      const all = rf.getNodes();
      const dBox = boxOf(dragged);
      const tpl = all.find((n) => n.type === "template" && overlaps(dBox, boxOf(n)));
      if (tpl) {
        createComposition(str(dragged.data, "designId"), str(tpl.data, "templateKey"), {
          x: dragged.position.x + 70,
          y: dragged.position.y + 70,
        });
      }
    },
    [rf, createComposition],
  );

  const onNodeClick = useCallback((_e: unknown, node: Node) => {
    if (node.type === "composition") {
      const id = str(node.data, "compositionId");
      if (id) setModalCompId(id);
    }
  }, []);

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

  // Generate a design from a chat prompt → optimistic skeleton, replaced on success.
  const onPrompt = useCallback(
    async (prompt: string) => {
      const tempId = crypto.randomUUID();
      setDesignList((cur) => [{ id: tempId, thumbUrl: "", url: "", prompt, pending: true }, ...cur]);
      try {
        const res = await fetch("/api/admin/designs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ catalogueId: catalogue.id, prompt }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          design?: { id: string; thumbUrl: string; url: string; prompt: string };
          error?: string;
        };
        if (!res.ok || !data.design) throw new Error(data.error ?? "Generation failed");
        const real = data.design;
        setDesignList((cur) => cur.map((d) => (d.id === tempId ? { ...real } : d)));
      } catch (e) {
        setDesignList((cur) => cur.filter((d) => d.id !== tempId));
        if (typeof window !== "undefined") window.alert(e instanceof Error ? e.message : "Generation failed");
      }
    },
    [catalogue.id],
  );

  return (
    <div className="flex h-[100dvh] flex-col bg-ink text-bone">
      <header className="flex items-center gap-3 border-b border-bone/10 px-3 py-2">
        <CatalogueSwitcher current={catalogue} catalogues={catalogues} />
        <div className="min-w-0 flex-1">
          <DesignsHistoryBar designs={designList} onAdd={addDesign} />
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <aside className="hidden w-44 shrink-0 overflow-y-auto border-r border-bone/10 p-2 lg:block">
          <TemplatesRail onAdd={addTemplate} />
        </aside>

        <div id="designer-flow" className="relative min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            onNodesChange={onNodesChange}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            nodesConnectable={false}
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
          <ChatPanel onSubmit={onPrompt} variant="side" />
        </aside>
      </div>

      {/* Mobile templates dock */}
      <div className="border-t border-bone/10 p-2 lg:hidden">
        <TemplatesRail onAdd={addTemplate} orientation="horizontal" />
      </div>

      {/* Mobile chat */}
      <ChatPanel onSubmit={onPrompt} variant="mobile" />

      {modalCompId ? (
        <CompositionModal
          compositionId={modalCompId}
          onClose={() => setModalCompId(null)}
          onDiscarded={onDiscarded}
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
