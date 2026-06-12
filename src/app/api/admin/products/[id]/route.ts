import { db } from "@/lib/db";
import { products } from "@/db/schema";
import { requireAdminRoute } from "@/lib/admin/auth";
import { deleteSyncProduct } from "@/lib/printful/client";
import { eq } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

// Pause / unpause (toggle storefront visibility).
export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireAdminRoute();
  if (denied) return denied;
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { isPublished?: boolean } | null;
  if (typeof body?.isPublished !== "boolean") {
    return Response.json({ error: "isPublished (boolean) required" }, { status: 400 });
  }
  const [row] = await db
    .update(products)
    .set({ isPublished: body.isPublished })
    .where(eq(products.id, id))
    .returning();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ product: { id: row.id, isPublished: row.isPublished } });
}

// Delete a product from the store (DB + the Printful sync product).
export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await requireAdminRoute();
  if (denied) return denied;
  const { id } = await params;
  const [row] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });

  let printfulWarning: string | null = null;
  if (row.printfulSyncProductId) {
    try {
      await deleteSyncProduct(row.printfulSyncProductId);
    } catch (e) {
      printfulWarning = `Removed from store, but Printful delete failed: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  await db.delete(products).where(eq(products.id, id)); // variants cascade
  return Response.json({ ok: true, warning: printfulWarning });
}
