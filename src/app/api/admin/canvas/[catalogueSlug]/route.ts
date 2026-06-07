import { db } from "@/lib/db";
import { catalogues, canvasNodes } from "@/db/schema";
import { requireAdminRoute } from "@/lib/admin/auth";
import { eq } from "drizzle-orm";

type Ctx = { params: Promise<{ catalogueSlug: string }> };

async function catalogueBySlug(slug: string) {
  const [c] = await db.select().from(catalogues).where(eq(catalogues.slug, slug)).limit(1);
  return c;
}

export async function GET(_req: Request, { params }: Ctx) {
  const denied = await requireAdminRoute();
  if (denied) return denied;

  const { catalogueSlug } = await params;
  const cat = await catalogueBySlug(catalogueSlug);
  if (!cat) return Response.json({ error: "Catalogue not found" }, { status: 404 });

  const nodes = await db.select().from(canvasNodes).where(eq(canvasNodes.catalogueId, cat.id));
  return Response.json({ nodes });
}

interface IncomingNode {
  id?: string;
  kind?: string;
  refId?: string;
  x?: number;
  y?: number;
  scale?: number;
  zIndex?: number;
}

// Replace-all: simplest idempotent persistence for a single-admin canvas.
export async function PUT(req: Request, { params }: Ctx) {
  const denied = await requireAdminRoute();
  if (denied) return denied;

  const { catalogueSlug } = await params;
  const cat = await catalogueBySlug(catalogueSlug);
  if (!cat) return Response.json({ error: "Catalogue not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { nodes?: IncomingNode[] } | null;
  const incoming = Array.isArray(body?.nodes) ? body!.nodes! : null;
  if (!incoming) return Response.json({ error: "nodes array required" }, { status: 400 });

  await db.delete(canvasNodes).where(eq(canvasNodes.catalogueId, cat.id));
  if (incoming.length) {
    await db.insert(canvasNodes).values(
      incoming
        .filter((n) => n.kind && n.refId)
        .map((n) => ({
          ...(typeof n.id === "string" && n.id.length === 36 ? { id: n.id } : {}),
          catalogueId: cat.id,
          kind: String(n.kind),
          refId: String(n.refId),
          x: Math.round(Number(n.x) || 0),
          y: Math.round(Number(n.y) || 0),
          scale: Math.round(Number(n.scale) || 100),
          zIndex: Math.round(Number(n.zIndex) || 0),
        })),
    );
  }
  return Response.json({ ok: true });
}
