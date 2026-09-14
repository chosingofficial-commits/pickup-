import Link from "next/link";
import { Star } from "lucide-react";
import { ProductImage } from "./product-image";
import { AddToCartButton } from "./add-to-cart-button";
import { WishlistButton } from "./wishlist-button";
import { QuickViewButton } from "./quick-view-button";
import { Badge } from "@/components/ui/badge";
import { formatBDT } from "@/lib/utils";
import type { ProductListItem } from "@/lib/catalog/queries";

export function ProductCard({ product, isSaved }: { product: ProductListItem; isSaved?: boolean }) {
  const discountPct = product.compareAtPrice
    ? Math.round((1 - Number(product.price) / Number(product.compareAtPrice)) * 100)
    : null;
  const outOfStock = product.availability !== "AVAILABLE";
  const href = `/marketplace/${product.vendor.slug}/${product.slug}`;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-card border border-border-brand bg-white shadow-soft transition-shadow hover:shadow-lifted">
      <div className="relative aspect-square">
        <Link href={href} className="block h-full w-full" tabIndex={-1}>
          <ProductImage
            src={product.images[0]?.url}
            alt={product.name}
            categorySlug={product.category.slug}
            className="h-full w-full"
          />
        </Link>
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.isAgeRestricted && <Badge variant="danger">18+</Badge>}
          {product.isWeeklyGrocery && <Badge variant="accent">Next-day</Badge>}
          {discountPct ? <Badge variant="brand">{discountPct}% OFF</Badge> : null}
          {outOfStock && <Badge variant="dark">{product.availability === "OUT_OF_STOCK" ? "Out of stock" : "Unavailable"}</Badge>}
        </div>
        <div className="absolute right-2 top-2 flex flex-col gap-1.5">
          <WishlistButton productId={product.id} isSaved={isSaved} />
          <QuickViewButton
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              unit: product.unit,
              price: product.price.toString(),
              ratingAvg: product.ratingAvg.toString(),
              ratingCount: product.ratingCount,
              images: product.images.map((img) => ({ url: img.url })),
              category: { slug: product.category.slug },
              vendor: { slug: product.vendor.slug, businessName: product.vendor.businessName },
            }}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link href={href} className="line-clamp-2 text-sm font-semibold text-brand-dark hover:text-brand-primary">
          {product.name}
        </Link>
        <p className="text-xs text-gray-500">
          {product.unit} · {product.vendor.businessName}
        </p>
        {product.ratingCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
            {Number(product.ratingAvg).toFixed(1)} ({product.ratingCount})
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <p className="font-heading text-base font-bold text-brand-dark">{formatBDT(product.price)}</p>
            {product.compareAtPrice && (
              <p className="text-xs text-gray-400 line-through">{formatBDT(product.compareAtPrice)}</p>
            )}
          </div>
        </div>

        {!outOfStock && <AddToCartButton productId={product.id} className="mt-2" />}
      </div>
    </div>
  );
}
