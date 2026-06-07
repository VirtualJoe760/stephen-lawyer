import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { requireAdminPage } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { catalogues, canvasNodes, designs } from "@/db/schema";
import { getCatalogBlanks, type CatalogBlank } from "@/lib/printful/catalog";
import DesignerCanvas from "@/components/admin/DesignerCanvas";

export const dynamic = "force-dynamic";

export default async function DesignerCanvasPage({
  params,
}: {
  params: Promise<{ catalogueSlug: string }>;
}) {
  await requireAdminPage();
  const { catalogueSlug } = await params;

  const [cat] = await db
    .select()
    .from(catalogues)
    .where(eq(catalogues.slug, catalogueSlug))
    .limit(1);
  if (!cat) notFound();

  // Full Printful catalog for the blank picker (cached server-side). Degrade to
  // an empty list if Printful is unreachable so the canvas still loads.
  let blanks: CatalogBlank[] = [];
  try {
    blanks = await getCatalogBlanks();
  } catch {
    blanks = [];
  }

  const [allCatalogues, nodeRows, designRows] = await Promise.all([
    db.select().from(catalogues).orderBy(asc(catalogues.sortOrder), asc(catalogues.createdAt)),
    db.select().from(canvasNodes).where(eq(canvasNodes.catalogueId, cat.id)),
    db.select().from(designs).where(eq(designs.catalogueId, cat.id)).orderBy(desc(designs.createdAt)),
  ]);

  return (
    <DesignerCanvas
      catalogue={{ id: cat.id, name: cat.name, slug: cat.slug }}
      catalogues={allCatalogues.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
      initialNodes={nodeRows.map((n) => ({
        id: n.id,
        kind: n.kind,
        refId: n.refId,
        x: n.x,
        y: n.y,
        scale: n.scale,
        zIndex: n.zIndex,
      }))}
      designs={designRows.map((d) => ({
        id: d.id,
        thumbUrl: d.thumbUrl,
        url: d.url,
        prompt: d.prompt,
      }))}
      blanks={blanks}
    />
  );
}
