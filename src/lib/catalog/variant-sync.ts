import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
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

/**
 * Self-healing counterpart to the variants backfill migration: every active
 * product is supposed to always have at least one variant, but a product
 * created by pre-variants code during the few minutes between `migrate
 * deploy` and the new build going live would have none. Rather than letting
 * add-to-cart/the product page/checkout/the vendor edit form error on that,
 * this creates the same single "1 pc at the product's current price" default
 * the backfill migration would have — a no-op if a variant already exists.
 * Pass a transaction client when calling from inside one (e.g. checkout).
 */
export async function ensureDefaultVariant(productId: string, client: Prisma.TransactionClient = db): Promise<void> {
  const existing = await client.productVariant.findFirst({ where: { productId, isActive: true } });
  if (existing) return;

  const product = await client.product.findUnique({ where: { id: productId }, include: { inventory: true } });
  if (!product) return;

  await client.productVariant.create({
    data: {
      productId,
      name: "Default",
      quantityValue: 1,
      unit: "PCS",
      packCount: 1,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      stockQty: product.inventory?.quantityInStock ?? 0,
      isDefault: true,
      isActive: true,
      sortOrder: 0,
    },
  });
}
