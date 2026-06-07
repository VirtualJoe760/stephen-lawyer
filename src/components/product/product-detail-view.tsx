"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { ProductDetail } from "@/types";
import { Button } from "@/components/ui/button";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/store/cart";
import { formatMoney, cn } from "@/lib/utils";

export function ProductDetailView({ product }: { product: ProductDetail }) {
  const [colorIdx, setColorIdx] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const add = useCart((s) => s.add);

  const color = product.colors[colorIdx]!;
  const variantsForColor = useMemo(
    () => product.variants.filter((v) => v.color === color.name),
    [product.variants, color.name],
  );
  const selectedVariant = useMemo(
    () => variantsForColor.find((v) => v.size === size) ?? null,
    [variantsForColor, size],
  );

  const handleAdd = () => {
    if (!selectedVariant) {
      alert("Pick a size.");
      return;
    }
    add({
      variantId: selectedVariant.id,
      productSlug: product.slug,
      productName: product.name,
      color: selectedVariant.color,
      size: selectedVariant.size,
      unitPriceCents: selectedVariant.priceCents,
      imageUrl: selectedVariant.imageUrl,
      quantity: qty,
    });
  };

  const gallery = product.gallery.length > 0 ? product.gallery : [product.primaryImage];

  return (
    <div className="grid lg:grid-cols-[1.5fr_1fr] gap-10 lg:gap-16">
      {/* Gallery */}
      <div className="flex flex-col gap-3">
        <div className="relative aspect-[4/5] bg-bone-200 overflow-hidden">
          <Image
            src={gallery[activeImage] ?? gallery[0]!}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-cover"
            priority
          />
          {product.badges && product.badges.length > 0 && (
            <div className="absolute top-4 left-4 flex flex-col gap-2 items-start">
              {product.badges.map((b) => (
                <Badge key={b} tone={b === "NEW" ? "hazard" : "acid"} rotate>{b}</Badge>
              ))}
              {product.edition && <Badge tone="ink" rotate>{product.edition}</Badge>}
            </div>
          )}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {gallery.map((img, i) => (
            <button
              key={img}
              type="button"
              onClick={() => setActiveImage(i)}
              className={cn(
                "relative aspect-[4/5] bg-bone-200 border-2",
                i === activeImage ? "border-hazard" : "border-transparent hover:border-ink",
              )}
              aria-label={`Image ${i + 1}`}
            >
              <Image src={img} alt="" fill sizes="200px" className="object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <h1 className="wordmark text-4xl md:text-5xl lg:text-6xl leading-[0.85]">{product.name}</h1>
        <p className="font-mono text-lg mt-3">{formatMoney(product.priceCents)}</p>
        <p className="mt-6 text-sm leading-relaxed max-w-prose">{product.description}</p>

        {/* Color */}
        <fieldset className="mt-8">
          <legend className="font-mono text-xs uppercase tracking-widest mb-3">
            Color: <span className="text-ink/60">{color.name}</span>
          </legend>
          <div className="flex gap-2">
            {product.colors.map((c, i) => (
              <button
                key={c.name}
                type="button"
                onClick={() => { setColorIdx(i); setSize(null); }}
                aria-label={c.name}
                aria-pressed={i === colorIdx}
                className={cn(
                  "w-10 h-10 border-2 transition-all",
                  i === colorIdx ? "border-ink ring-2 ring-bone ring-offset-2 ring-offset-ink" : "border-ink/30 hover:border-ink",
                )}
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </fieldset>

        {/* Size */}
        <fieldset className="mt-6">
          <legend className="font-mono text-xs uppercase tracking-widest mb-3 flex justify-between">
            <span>Size</span>
            <a href="/sizing" className="underline hover:text-hazard normal-case tracking-normal">
              Size guide
            </a>
          </legend>
          <div className="flex flex-wrap gap-2">
            {variantsForColor.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={!v.inStock}
                onClick={() => setSize(v.size)}
                className={cn(
                  "h-12 min-w-12 px-3 border-2 font-mono text-xs uppercase tracking-widest",
                  size === v.size
                    ? "border-hazard bg-hazard text-ink"
                    : "border-ink hover:border-hazard",
                  !v.inStock && "opacity-40 line-through cursor-not-allowed hover:border-ink",
                )}
              >
                {v.size}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Quantity */}
        <fieldset className="mt-6">
          <legend className="font-mono text-xs uppercase tracking-widest mb-3">Quantity</legend>
          <div className="inline-flex border-2 border-ink">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-10 h-12 hover:bg-ink hover:text-bone"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-12 h-12 flex items-center justify-center font-mono">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(10, q + 1))}
              className="w-10 h-12 hover:bg-ink hover:text-bone"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </fieldset>

        <Button onClick={handleAdd} className="w-full mt-8" size="lg">
          Add to cart
        </Button>

        <p className="mt-4 font-mono text-xs text-ink/60 leading-relaxed">
          Made on demand. Ships in 3–7 business days from a Printful facility.
        </p>

        <div className="mt-10">
          <Accordion
            items={[
              { id: "materials", title: "Materials", body: <p className="leading-relaxed">{product.materials}</p> },
              { id: "care", title: "Care", body: <p className="leading-relaxed">{product.care}</p> },
              { id: "sizing", title: "Sizing", body: <p className="leading-relaxed">{product.sizingNote}</p> },
              {
                id: "shipping",
                title: "Shipping",
                body: (
                  <p className="leading-relaxed">
                    Production: 2–5 business days. Shipping: 3–7 days in the US, 7–20 international. Rates calculated at checkout.
                  </p>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
