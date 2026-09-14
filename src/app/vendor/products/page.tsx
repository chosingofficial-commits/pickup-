import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ProductImage } from "@/components/product/product-image";
import { Badge } from "@/components/ui/badge";
import { AvailabilitySelect } from "@/components/vendor-dashboard/availability-select";
import { getCurrentUser } from "@/lib/auth/session";
import { getVendorProducts } from "@/lib/vendor/queries";
import { togglePublishAction, deleteProductAction } from "@/lib/actions/vendor-products";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Products" };

export default async function VendorProductsPage() {
  const user = await getCurrentUser();
  if (!user?.vendorProfile) return null;
  const products = await getVendorProducts(user.vendorProfile.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-brand-dark">Products</h1>
        <Link href="/vendor/products/new" className="flex items-center gap-1.5 rounded-control bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-hover">
          <Plus className="h-4 w-4" aria-hidden />
          Add product
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-gray-500">You haven&apos;t added any products yet.</p>
      ) : (
        <div className="space-y-2">
          {products.map((product) => (
            <div key={product.id} className="flex flex-wrap items-center gap-3 rounded-card border border-border-brand bg-white p-3">
              <ProductImage src={product.images[0]?.url} alt={product.name} categorySlug={product.category.slug} className="h-14 w-14 shrink-0 rounded-control" />
              <div className="min-w-[160px] flex-1">
                <p className="text-sm font-semibold text-brand-dark">{product.name}</p>
                <p className="text-xs text-gray-500">
                  {formatBDT(product.price)} · Stock: {product.inventory?.quantityInStock ?? 0}
                </p>
              </div>

              <Badge variant={product.isPublished ? "brand" : "outline"}>{product.isPublished ? "Published" : "Unpublished"}</Badge>
              {product.isWeeklyGrocery && <Badge variant="accent">Weekly grocery</Badge>}

              <AvailabilitySelect productId={product.id} value={product.availability} />

              <div className="flex items-center gap-1.5">
                <form action={togglePublishAction}>
                  <input type="hidden" name="productId" value={product.id} />
                  <button type="submit" className="rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
                    {product.isPublished ? "Unpublish" : "Publish"}
                  </button>
                </form>
                <Link href={`/vendor/products/${product.id}/edit`} className="rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
                  Edit
                </Link>
                <form action={deleteProductAction}>
                  <input type="hidden" name="productId" value={product.id} />
                  <button type="submit" className="rounded-control border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
