import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, Truck, Store } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductCard } from "@/components/product/product-card";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { JsonLd } from "@/components/seo/json-ld";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog/queries";
import { getSelectedLocation } from "@/lib/location/cookie";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/utils";
import { ensureDefaultVariant } from "@/lib/catalog/variant-sync";
import { publicEnv } from "@/lib/env/public";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ vendorSlug: string; productSlug: string }>;
}): Promise<Metadata> {
  const { vendorSlug, productSlug } = await params;
  const product = await getProductBySlug(vendorSlug, productSlug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description ?? `Buy ${product.name} from ${product.vendor.businessName} on Pick Up.`,
    openGraph: { images: product.images[0] ? [product.images[0].url] : [] },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ vendorSlug: string; productSlug: string }>;
}) {
  const { vendorSlug, productSlug } = await params;
  const product = await getProductBySlug(vendorSlug, productSlug);
  if (!product) notFound();

  // Self-heal: every active product should always have at least one variant
  // (see the backfill migration), but a product created by pre-variants code
  // during the deploy window wouldn't. getProductBySlug is request-cached,
  // so re-fetch the variants directly rather than calling it again.
  let variants = product.variants;
  if (variants.length === 0) {
    await ensureDefaultVariant(product.id);
    variants = await db.productVariant.findMany({ where: { productId: product.id, isActive: true }, orderBy: { sortOrder: "asc" } });
  }

  const [related, location, user] = await Promise.all([
    getRelatedProducts(product.categoryId, product.id, 6),
    getSelectedLocation(),
    getCurrentUser(),
  ]);

  const isSaved = user
    ? !!(await db.wishlistItem.findFirst({ where: { productId: product.id, wishlist: { userId: user.id } } }))
    : false;

  const discountPct = product.compareAtPrice
    ? Math.round((1 - Number(product.price) / Number(product.compareAtPrice)) * 100)
    : null;

  // A product counts as out of stock only when every one of its active
  // options is at 0 — the vendor's own availability toggle can also force
  // it regardless of stock.
  const allVariantsSoldOut = variants.length > 0 && variants.every((v) => v.stockQty <= 0);
  const isOutOfStock = product.availability === "OUT_OF_STOCK" || allVariantsSoldOut;
  const purchaseVariants = variants.map((v) => ({
    id: v.id,
    quantityValue: v.quantityValue.toString(),
    unit: v.unit,
    packCount: v.packCount,
    price: Number(v.price),
    compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
    stockQty: v.stockQty,
    isActive: v.isActive,
    isDefault: v.isDefault,
  }));

  return (
    <Container className="py-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description ?? undefined,
          image: product.images[0]?.url,
          sku: product.sku ?? undefined,
          brand: { "@type": "Brand", name: product.vendor.businessName },
          aggregateRating:
            product.ratingCount > 0
              ? { "@type": "AggregateRating", ratingValue: Number(product.ratingAvg), reviewCount: product.ratingCount }
              : undefined,
          offers: {
            "@type": "Offer",
            url: `${publicEnv.appUrl}/marketplace/${product.vendor.slug}/${product.slug}`,
            priceCurrency: "BDT",
            price: Number(product.price),
            availability: product.availability === "AVAILABLE" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
        }}
      />
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-gray-500">
        <Link href="/marketplace" className="hover:text-brand-primary">
          Marketplace
        </Link>
        {" / "}
        <Link href={`/marketplace?category=${product.category.slug}`} className="hover:text-brand-primary">
          {product.category.name}
        </Link>
        {" / "}
        <span className="text-brand-dark">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          {product.images.length > 0 ? (
            <ProductGallery images={product.images} productName={product.name} />
          ) : (
            <div className="aspect-square w-full rounded-card bg-surface-muted" />
          )}
        </div>

        <div>
          {discountPct && <Badge variant="brand">{discountPct}% OFF</Badge>}
          {product.isWeeklyGrocery && (
            <Badge variant="accent" className="ml-2">
              Next-day delivery
            </Badge>
          )}
          {(isOutOfStock || product.availability === "TEMPORARILY_UNAVAILABLE") && (
            <Badge variant="dark" className="ml-2">
              {isOutOfStock ? "Out of stock" : "Temporarily unavailable"}
            </Badge>
          )}

          <h1 className="mt-2 font-heading text-2xl font-bold text-brand-dark sm:text-3xl">{product.name}</h1>
          {product.isWeeklyGrocery && (
            <p className="mt-1 text-sm text-amber-700">
              This is a weekly grocery pick — orders containing it must be scheduled at least 24 hours ahead.
            </p>
          )}

          {product.ratingCount > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-600">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
              <span className="font-semibold text-brand-dark">{Number(product.ratingAvg).toFixed(1)}</span>
              <span>({product.ratingCount} reviews)</span>
            </div>
          )}

          <div className="mt-4">
            <PurchasePanel
              productId={product.id}
              productName={product.name}
              productUnit={product.unit}
              variants={purchaseVariants}
              isSaved={isSaved}
            />
          </div>

          <div className="mt-6 space-y-2 rounded-card border border-border-brand bg-surface-muted p-4 text-sm">
            <p className="flex items-center gap-2 text-brand-dark">
              <Store className="h-4 w-4 text-brand-primary" aria-hidden />
              Sold by <span className="font-semibold">{product.vendor.businessName}</span>
            </p>
            <p className="flex items-center gap-2 text-brand-dark">
              <Truck className="h-4 w-4 text-brand-primary" aria-hidden />
              {location?.isCovered
                ? `Delivery in ${location.etaMin}–${location.etaMax} min · ${formatBDT(location.deliveryFee ?? 0)} delivery fee`
                : "Select your delivery location to see exact delivery time and fee"}
            </p>
          </div>

          {product.description && (
            <div className="mt-6">
              <h2 className="font-heading text-base font-bold text-brand-dark">Description</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{product.description}</p>
            </div>
          )}
        </div>
      </div>

      {product.reviews.length > 0 && (
        <div className="mt-12">
          <h2 className="font-heading text-xl font-bold text-brand-dark">Ratings & reviews</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {product.reviews.map((review) => (
              <div key={review.id} className="rounded-card border border-border-brand bg-white p-4">
                <div className="flex items-center gap-0.5" aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                  ))}
                </div>
                {review.comment && <p className="mt-2 text-sm text-gray-700">{review.comment}</p>}
                <p className="mt-2 text-xs font-semibold text-brand-dark">{review.customer.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="font-heading text-xl font-bold text-brand-dark">Related products</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </Container>
  );
}
