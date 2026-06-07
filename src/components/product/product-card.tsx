import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import type { ProductSummary } from "@/types";

export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] bg-bone-200 overflow-hidden">
        <Image
          src={product.primaryImage}
          alt={product.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-opacity duration-200 group-hover:opacity-0"
        />
        {product.hoverImage && (
          <Image
            src={product.hoverImage}
            alt=""
            aria-hidden
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          />
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
          {product.badges?.map((b) => (
            <Badge key={b} tone={b === "NEW" ? "hazard" : b === "RESTOCK" ? "acid" : "pink"} rotate>
              {b}
            </Badge>
          ))}
          {product.edition && (
            <Badge tone="ink" rotate>
              {product.edition}
            </Badge>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="wordmark text-base leading-tight">{product.name}</h3>
          <div className="flex gap-1 mt-1.5">
            {product.colors.slice(0, 5).map((c) => (
              <span
                key={c.name}
                title={c.name}
                aria-label={c.name}
                className="w-3 h-3 border border-ink/30"
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </div>
        <span className="font-mono text-sm shrink-0">{formatMoney(product.priceCents)}</span>
      </div>
    </Link>
  );
}
