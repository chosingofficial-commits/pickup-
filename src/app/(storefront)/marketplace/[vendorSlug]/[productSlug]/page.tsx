import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, Truck, Store } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/product/product-image";
import { ProductCard } from "@/components/product/product-card";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { JsonLd } from "@/components/seo/json-ld";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog/queries";
import { getSelectedLocation } from "@/lib/location/cookie";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/utils";
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
        <div className="space-y-3">
          <ProductImage
            src={product.images[0]?.url}
            alt={product.name}
            categorySlug={product.category.slug}
            className="aspect-square w-full rounded-card"
          />
          {product.images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {product.images.slice(0, 5).map((img) => (
                <ProductImage key={img.id} src={img.url} alt={product.name} className="aspect-square rounded-control" />
              ))}
            </div>
          )}
        </div>

        <div>
          {discountPct && <Badge variant="brand">{discountPct}% OFF</Badge>}
          {product.isWeeklyGrocery && (
            <Badge variant="accent" className="ml-2">
              Next-day delivery
            </Badge>
          )}
          {product.availability !== "AVAILABLE" && (
            <Badge variant="dark" className="ml-2">
              {product.availability === "OUT_OF_STOCK" ? "Out of stock" : "Temporarily unavailable"}
            </Badge>
          )}

          <h1 className="mt-2 font-heading text-2xl font-bold text-brand-dark sm:text-3xl">{product.name}</h1>
          {product.isWeeklyGrocery && (
            <p className="mt-1 text-sm text-amber-700">
              This is a weekly grocery pick — orders containing it must be scheduled at least 24 hours ahead.
            </p>
          )}
          <p className="mt-1 text-sm text-gray-500">{product.unit}</p>

          {product.ratingCount > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-600">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
              <span className="font-semibold text-brand-dark">{Number(product.ratingAvg).toFixed(1)}</span>
              <span>({product.ratingCount} reviews)</span>
            </div>
          )}

          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-heading text-3xl font-bold text-brand-dark">{formatBDT(product.price)}</span>
            {product.compareAtPrice && (
              <span className="text-lg text-gray-400 line-through">{formatBDT(product.compareAtPrice)}</span>
            )}
          </div>

          {product.availability === "AVAILABLE" && product.inventory && (
            <p className="mt-1 text-sm text-gray-600">
              {product.inventory.quantityInStock > 50 ? "50+ in stock" : `${product.inventory.quantityInStock} in stock`}
            </p>
          )}

          <div className="mt-6">
            <PurchasePanel productId={product.id} productName={product.name} isSaved={isSaved} />
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
