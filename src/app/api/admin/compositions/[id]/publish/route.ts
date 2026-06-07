import { db } from "@/lib/db";
import { compositions, designs, products } from "@/db/schema";
import { requireAdminRoute } from "@/lib/admin/auth";
import { getTemplate } from "@/lib/printful/templates";
import { upscaleForPrint } from "@/lib/printful/upscale";
import { createSyncProduct } from "@/lib/printful/client";
import { syncPrintfulCatalog } from "@/lib/printful/sync";
import { eq } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const denied = await requireAdminRoute();
  if (denied) return denied;

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    description?: string;
    placement?: string;
    variants?: Array<{ printfulVariantId: number; retailPriceCents: number }>;
  } | null;

  const name = body?.name?.trim();
  const variants = Array.isArray(body?.variants) ? body!.variants! : [];
  if (!name) return Response.json({ error: "Product name is required" }, { status: 400 });
  if (!variants.length) return Response.json({ error: "Select at least one variant" }, { status: 400 });

  const [comp] = await db.select().from(compositions).where(eq(compositions.id, id)).limit(1);
  if (!comp) return Response.json({ error: "Composition not found" }, { status: 404 });

  // Idempotency: if already published, don't re-create.
  if (comp.status === "published" && comp.printfulSyncProductId) {
    return Response.json({ ok: true, alreadyPublished: true, printfulSyncProductId: comp.printfulSyncProductId });
  }

  const [design] = await db.select().from(designs).where(eq(designs.id, comp.designId)).limit(1);
  if (!design) return Response.json({ error: "Design not found" }, { status: 404 });
  const tpl = getTemplate(comp.templateKey);
  if (!tpl) return Response.json({ error: "Template not found" }, { status: 400 });

  const placement = body?.placement?.trim() || comp.placement;
  // Print file = raw design PNG, upscaled. NOT the review composite.
  const printUrl = upscaleForPrint(design.cloudinaryPublicId);

  // If the operator set an explicit size/placement, send it so production
  // matches the preview. Otherwise Printful auto-fits (centered).
  const position = comp.position
    ? {
        area_width: comp.position.areaWidth,
        area_height: comp.position.areaHeight,
        width: comp.position.width,
        height: comp.position.height,
        top: comp.position.top,
        left: comp.position.left,
      }
    : undefined;

  let syncProductId = "";
  try {
    const synced = await createSyncProduct(
      {
        sync_product: { name, thumbnail: comp.previewUrl ?? undefined },
        sync_variants: variants.map((v) => ({
          variant_id: v.printfulVariantId,
          retail_price: (v.retailPriceCents / 100).toFixed(2),
          files: [{ type: placement, url: printUrl, ...(position ? { position } : {}) }],
        })),
      },
      comp.id, // idempotency key
    );
    syncProductId = String(synced.sync_product?.id ?? "");
  } catch (e) {
    return Response.json(
      { error: `Printful create failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 },
    );
  }

  await db
    .update(compositions)
    .set({ status: "published", printfulSyncProductId: syncProductId })
    .where(eq(compositions.id, comp.id));

  // Mirror into products/variants, then publish + set description.
  try {
    await syncPrintfulCatalog();
    if (syncProductId) {
      await db
        .update(products)
        .set({ isPublished: true })
        .where(eq(products.printfulSyncProductId, syncProductId));
      if (body?.description?.trim()) {
        await db
          .update(products)
          .set({ descriptionMd: body.description.trim() })
          .where(eq(products.printfulSyncProductId, syncProductId));
      }
    }
  } catch (e) {
    return Response.json({
      ok: true,
      warning: `Published to Printful, but catalog sync failed: ${e instanceof Error ? e.message : String(e)}`,
      printfulSyncProductId: syncProductId,
    });
  }

  return Response.json({ ok: true, printfulSyncProductId: syncProductId });
}
