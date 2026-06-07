import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireAdminPage } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { compositions } from "@/db/schema";
import { getCatalogProduct } from "@/lib/printful/client";
import { FinalizeForm, type FinalizeVariant } from "@/components/admin/FinalizeForm";

export const dynamic = "force-dynamic";

export default async function FinalizePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;

  const [comp] = await db.select().from(compositions).where(eq(compositions.id, id)).limit(1);
  if (!comp) notFound();

  // comp.templateKey holds the Printful catalog product id. Fetch all variants;
  // the form groups them by color so big products stay manageable.
  const productId = Number(comp.templateKey);
  let variants: FinalizeVariant[] = [];
  let variantsError: string | null = null;
  let templateName = comp.templateKey;
  if (Number.isFinite(productId)) {
    try {
      const { product, variants: all } = await getCatalogProduct(productId);
      templateName = product.title;
      variants = all.map((v) => ({
        id: v.id,
        name: v.name,
        size: v.size,
        color: v.color,
        priceCents: Math.round(Number(v.price) * 100),
      }));
    } catch (e) {
      variantsError = `Couldn't load Printful variants: ${e instanceof Error ? e.message : String(e)}`;
    }
  } else {
    variantsError = "This composition has no valid Printful product.";
  }

  return (
    <FinalizeForm
      compositionId={comp.id}
      previewUrl={comp.previewUrl}
      templateName={templateName}
      placements={["front", "back", "embroidery_front"]}
      defaultPlacement={comp.placement}
      variants={variants}
      variantsError={variantsError}
    />
  );
}
