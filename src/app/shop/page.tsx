import { ShopPage } from "@/components/shop/shop-page";
import { getStoreSummaries } from "@/lib/db-products";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop",
  description: "All apparel from STEPHEN LAWYER. Tees, hoodies, hats, accessories. Made on demand.",
};

export default async function Shop() {
  const products = await getStoreSummaries();
  return <ShopPage products={products} title="All" />;
}
