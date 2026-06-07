import { ShopPage } from "@/components/shop/shop-page";
import { getMockSummaries } from "@/lib/mock-products";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop",
  description: "All apparel from STEPHEN LAWYER. Tees, hoodies, hats, accessories. Made on demand.",
};

export default function Shop() {
  const products = getMockSummaries();
  return <ShopPage products={products} title="All" />;
}
