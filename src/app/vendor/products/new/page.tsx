import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { ProductForm } from "@/components/vendor-dashboard/product-form";
import { getCategoriesForProductForm } from "@/lib/vendor/queries";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  const categories = await getCategoriesForProductForm();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Add product</h1>
      <Card>
        <CardContent className="pt-5">
          <ProductForm categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
