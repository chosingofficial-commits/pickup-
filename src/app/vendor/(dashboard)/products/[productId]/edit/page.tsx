import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ProductForm } from "@/components/vendor-dashboard/product-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getCategoriesForProductForm } from "@/lib/vendor/queries";
import { ensureDefaultVariant } from "@/lib/catalog/variant-sync";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const user = await getCurrentUser();
  if (!user?.vendorProfile) return null;

  const { productId } = await params;
  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id: productId },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      },
    }),
    getCategoriesForProductForm(),
  ]);

  if (!product || product.vendorId !== user.vendorProfile.id) notFound();

  // Self-heal: a product created by pre-variants code during the deploy
  // window could have no variants yet — without this, the vendor would open
  // an edit form with one blank, unpriced row instead of their real product.
  let variants = product.variants;
  if (variants.length === 0) {
    await ensureDefaultVariant(product.id);
    variants = await db.productVariant.findMany({ where: { productId: product.id, isActive: true }, orderBy: { sortOrder: "asc" } });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Edit product</h1>
      <Card>
        <CardContent className="pt-5">
          <ProductForm
            categories={categories}
            defaults={{
              id: product.id,
              name: product.name,
              categoryId: product.categoryId,
              description: product.description ?? undefined,
              sku: product.sku ?? undefined,
              images: product.images.map((img) => img.url),
              isWeeklyGrocery: product.isWeeklyGrocery,
              variants: variants.map((v) => ({
                id: v.id,
                quantityValue: v.quantityValue.toString(),
                unit: v.unit,
                packCount: v.packCount,
                price: Number(v.price),
                compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
                stock: v.stockQty,
                isDefault: v.isDefault,
              })),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
