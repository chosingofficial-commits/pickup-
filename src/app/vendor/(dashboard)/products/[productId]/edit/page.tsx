import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ProductForm } from "@/components/vendor-dashboard/product-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getCategoriesForProductForm } from "@/lib/vendor/queries";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const user = await getCurrentUser();
  if (!user?.vendorProfile) return null;

  const { productId } = await params;
  const [product, categories] = await Promise.all([
    db.product.findUnique({ where: { id: productId }, include: { inventory: true, images: { orderBy: { sortOrder: "asc" } } } }),
    getCategoriesForProductForm(),
  ]);

  if (!product || product.vendorId !== user.vendorProfile.id) notFound();

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
              price: Number(product.price),
              compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
              unit: product.unit,
              sku: product.sku ?? undefined,
              quantityInStock: product.inventory?.quantityInStock ?? 0,
              images: product.images.map((img) => img.url),
              isWeeklyGrocery: product.isWeeklyGrocery,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
