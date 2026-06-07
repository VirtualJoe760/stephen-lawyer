import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductDetailView } from "@/components/product/product-detail-view";
import { ProductCard } from "@/components/product/product-card";
import { getMockProduct, getMockSummaries, MOCK_PRODUCTS } from "@/lib/mock-products";
import { SITE_URL } from "@/lib/utils";

export function generateStaticParams() {
  return MOCK_PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getMockProduct(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [product.primaryImage],
    },
    alternates: { canonical: `${SITE_URL}/product/${slug}` },
  };
}

export default async function PDP({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getMockProduct(slug);
  if (!product) notFound();

  const related = getMockSummaries(product.category)
    .filter((p) => p.slug !== product.slug)
    .slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.gallery,
    brand: { "@type": "Brand", name: "Stephen Lawyer" },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/product/${product.slug}`,
      priceCurrency: product.currency,
      price: (product.priceCents / 100).toFixed(2),
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="px-4 md:px-8 pt-6 pb-20">
        <div className="max-w-[1600px] mx-auto">
          <nav className="mb-6 font-mono text-xs uppercase tracking-widest text-ink/60">
            <Link href="/shop" className="hover:text-hazard">Shop</Link>
            {" / "}
            <Link href={`/shop/${product.category}`} className="hover:text-hazard capitalize">
              {product.category}
            </Link>
          </nav>
          <ProductDetailView product={product} />
        </div>
      </div>

      {/* Editorial block */}
      {product.whyIMadeThis && (
        <section className="px-4 md:px-8 py-20 bg-ink text-bone">
          <div className="max-w-[1600px] mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div className="relative aspect-[4/5] bg-ink-soft">
              <Image
                src={product.gallery[2] ?? product.gallery[0] ?? product.primaryImage}
                alt={product.name}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-hazard mb-3">
                Why I made this one
              </p>
              <p className="text-2xl md:text-3xl leading-snug font-display uppercase">
                {product.whyIMadeThis}
              </p>
              <p className="mt-6 font-mono text-xs uppercase tracking-widest text-bone/60">
                — Stephen
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Related */}
      {related.length > 0 && (
        <section className="px-4 md:px-8 py-20">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="wordmark text-4xl md:text-5xl mb-10">You might also like</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
