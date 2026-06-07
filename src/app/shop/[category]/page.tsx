import { ShopPage } from "@/components/shop/shop-page";
import { getMockSummaries } from "@/lib/mock-products";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const CATEGORIES = ["tees", "hoodies", "hats", "accessories"] as const;
type Cat = (typeof CATEGORIES)[number];

const TITLES: Record<Cat, string> = {
  tees: "Tees",
  hoodies: "Hoodies",
  hats: "Hats",
  accessories: "Accessories",
};

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category }));
}

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
  const products = getMockSummaries(category);
  return <ShopPage products={products} title={TITLES[category as Cat]} category={category as Cat} />;
}
