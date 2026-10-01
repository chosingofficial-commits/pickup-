import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { formatVariantLabel } from "./variant-label";

/**
 * Recomputes Product.price/compareAtPrice/unit (from the cheapest active
 * variant) and Inventory.quantityInStock (sum of active variants' stock).
 * These stay as a maintained cache so existing readers that were never
 * touched for this feature — the marketplace price filter/sort, which
 * queries Product.price directly, and admin/vendor low-stock views, which
 * read Inventory — keep working unmodified. The ProductVariant rows are the
 * real source of truth; call this inside the same transaction as any
 * variant create/update/deactivate so the cache never observably drifts.
 */
export async function syncProductFromVariants(tx: Prisma.TransactionClient, productId: string): Promise<void> {
  const variants = await tx.productVariant.findMany({ where: { productId, isActive: true } });
  if (variants.length === 0) return;

  const cheapest = variants.reduce((min, v) => (Number(v.price) < Number(min.price) ? v : min));
  const totalStock = variants.reduce((sum, v) => sum + v.stockQty, 0);

  await tx.product.update({
    where: { id: productId },
    data: {
      price: cheapest.price,
      compareAtPrice: cheapest.compareAtPrice,
      unit: formatVariantLabel({ quantityValue: cheapest.quantityValue.toString(), unit: cheapest.unit, packCount: cheapest.packCount }, "en"),
    },
  });
  await tx.inventory.upsert({
    where: { productId },
    create: { productId, quantityInStock: totalStock },
    update: { quantityInStock: totalStock },
  });
}
