import { ShopPage } from "@/components/shop/shop-page";
import { getStoreSummaries } from "@/lib/db-products";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const CATEGORIES = ["tees", "hoodies", "hats", "accessories"] as const;
type Cat = (typeof CATEGORIES)[number];

const TITLES: Record<Cat, string> = {
  tees: "Tees",
  hoodies: "Hoodies",
  hats: "Hats",
  accessories: "Accessories",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const title = TITLES[category as Cat] ?? "Shop";
  return { title };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!CATEGORIES.includes(category as Cat)) notFound();
  const products = await getStoreSummaries(category as Cat);
  return <ShopPage products={products} title={TITLES[category as Cat]} category={category as Cat} />;
}
