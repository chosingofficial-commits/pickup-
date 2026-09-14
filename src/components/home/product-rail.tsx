import { ProductCard } from "@/components/product/product-card";
import type { ProductListItem } from "@/lib/catalog/queries";

export function ProductRail({ products }: { products: ProductListItem[] }) {
  if (products.length === 0) return null;

  return (
    <div className="-mx-4 flex snap-x gap-3.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-5">
      {products.map((product) => (
        <div key={product.id} className="w-40 shrink-0 snap-start sm:w-auto">
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}
