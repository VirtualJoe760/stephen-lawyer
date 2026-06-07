import { db } from "@/lib/db";
import { compositions, designs } from "@/db/schema";
import { requireAdminRoute } from "@/lib/admin/auth";
import { eq } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };
type Status = (typeof compositions.$inferInsert)["status"];
const ALLOWED: Status[] = ["draft", "approved", "published", "failed"];

export async function GET(_req: Request, { params }: Ctx) {
  const denied = await requireAdminRoute();
  if (denied) return denied;
  const { id } = await params;
  const [c] = await db.select().from(compositions).where(eq(compositions.id, id)).limit(1);
  if (!c) return Response.json({ error: "Not found" }, { status: 404 });
  const [d] = await db
    .select({ url: designs.url, thumbUrl: designs.thumbUrl })
    .from(designs)
    .where(eq(designs.id, c.designId))
    .limit(1);
  return Response.json({ composition: { ...c, designUrl: d?.url, designThumbUrl: d?.thumbUrl } });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireAdminRoute();
  if (denied) return denied;
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { status?: string } | null;
  const status = body?.status as Status | undefined;
  if (!status || !ALLOWED.includes(status)) {
    return Response.json({ error: "valid status required" }, { status: 400 });
  }
  const [c] = await db
    .update(compositions)
    .set({ status })
    .where(eq(compositions.id, id))
    .returning();
  if (!c) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ composition: c });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await requireAdminRoute();
  if (denied) return denied;
  const { id } = await params;
  await db.delete(compositions).where(eq(compositions.id, id));
  return Response.json({ ok: true });
}
