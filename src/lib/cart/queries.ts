import "server-only";
import { db } from "@/lib/db";

export async function getCartItemCount(userId: string | undefined): Promise<number> {
  if (!userId) return 0;
  const cart = await db.cart.findUnique({
    where: { userId },
    select: { items: { select: { quantity: true } } },
  });
  if (!cart) return 0;
  return cart.items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);
}

export async function getWishlistItemCount(userId: string | undefined): Promise<number> {
  if (!userId) return 0;
  const wishlist = await db.wishlist.findUnique({
    where: { userId },
    select: { _count: { select: { items: true } } },
  });
  return wishlist?._count.items ?? 0;
}

export type NormalizedCartLine = {
  id: string;
  productId: string | null;
  variantId: string | null;
  menuItemId: string | null;
  quantity: number;
  name: string;
  unit: string | null;
  imageUrl: string | null;
  unitPrice: number;
  addOnsTotal: number;
  selectedAddOns: { name: string; priceDelta: number }[];
  specialInstructions: string | null;
  isAvailable: boolean;
  vendorId: string;
  vendorSlug: string;
  vendorBusinessName: string;
  vendorBusinessType: "GROCERY_VENDOR" | "RESTAURANT";
  categorySlug: string | null;
  isWeeklyGrocery: boolean;
};

export async function getFullCart(userId: string) {
  const cart = await db.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: { include: { vendor: true, category: true, images: { take: 1 } } },
          variant: true,
          menuItem: { include: { menu: { include: { vendor: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const lines: NormalizedCartLine[] = [];

  for (const item of cart?.items ?? []) {
    if (item.product) {
      lines.push({
        id: item.id,
        productId: item.product.id,
        variantId: item.variantId,
        menuItemId: null,
        quantity: item.quantity,
        name: item.product.name,
        unit: item.product.unit,
        imageUrl: item.product.images[0]?.url ?? null,
        unitPrice: Number(item.variant ? Number(item.product.price) + Number(item.variant.priceDelta) : item.product.price),
        addOnsTotal: 0,
        selectedAddOns: [],
        specialInstructions: null,
        isAvailable: item.product.isPublished && item.product.availability === "AVAILABLE",
        vendorId: item.product.vendorId,
        vendorSlug: item.product.vendor.slug,
        vendorBusinessName: item.product.vendor.businessName,
        vendorBusinessType: item.product.vendor.businessType,
        categorySlug: item.product.category.slug,
        isWeeklyGrocery: item.product.isWeeklyGrocery,
      });
    } else if (item.menuItem) {
      const selectedAddOns = Array.isArray(item.selectedAddOns)
        ? (item.selectedAddOns as unknown as { name: string; priceDelta: number }[])
        : [];
      lines.push({
        id: item.id,
        productId: null,
        variantId: null,
        menuItemId: item.menuItem.id,
        quantity: item.quantity,
        name: item.menuItem.name,
        unit: null,
        imageUrl: item.menuItem.imageUrl,
        unitPrice: Number(item.menuItem.price),
        addOnsTotal: selectedAddOns.reduce((s, a) => s + Number(a.priceDelta), 0),
        selectedAddOns,
        specialInstructions: item.specialInstructions,
        isAvailable: item.menuItem.isAvailable,
        vendorId: item.menuItem.menu.vendorId,
        vendorSlug: item.menuItem.menu.vendor.slug,
        vendorBusinessName: item.menuItem.menu.vendor.businessName,
        vendorBusinessType: "RESTAURANT",
        categorySlug: null,
        isWeeklyGrocery: false,
      });
    }
  }

  const groups = new Map<string, { vendorId: string; vendorSlug: string; vendorBusinessName: string; vendorBusinessType: string; lines: NormalizedCartLine[] }>();
  for (const line of lines) {
    const existing = groups.get(line.vendorId);
    if (existing) {
      existing.lines.push(line);
    } else {
      groups.set(line.vendorId, {
        vendorId: line.vendorId,
        vendorSlug: line.vendorSlug,
        vendorBusinessName: line.vendorBusinessName,
        vendorBusinessType: line.vendorBusinessType,
        lines: [line],
      });
    }
  }

  return { lines, groups: Array.from(groups.values()) };
}

/** True when the cart contains a weekly grocery pick — those are batch-fulfilled, so the whole order must be scheduled at least 24h ahead rather than fast/ASAP. */
export async function cartRequiresAdvanceScheduling(userId: string): Promise<boolean> {
  const { lines } = await getFullCart(userId);
  return lines.some((l) => l.isWeeklyGrocery);
}
