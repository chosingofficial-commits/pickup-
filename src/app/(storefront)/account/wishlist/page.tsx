import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { getCurrentUser } from "@/lib/auth/session";
import { PRODUCT_CARD_INCLUDE } from "@/lib/catalog/queries";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Wishlist" };

export default async function AccountWishlistPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const wishlist = await db.wishlist.findUnique({
    where: { userId: user.id },
    include: {
      items: {
        include: { product: { include: PRODUCT_CARD_INCLUDE } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const products = (wishlist?.items ?? []).filter((i) => i.product).map((i) => i.product!);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Wishlist</h1>
      {products.length === 0 ? (
        <div className="rounded-card border border-border-brand bg-white p-10 text-center">
          <Heart className="mx-auto h-10 w-10 text-gray-300" aria-hidden />
          <p className="mt-2 text-sm text-gray-600">Save products you like to find them here later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} isSaved />
          ))}
        </div>
      )}
    </div>
  );
}
