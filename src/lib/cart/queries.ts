import "server-only";
import { db } from "@/lib/db";
import { getRestaurantStatus, type RestaurantStatus } from "@/lib/restaurant/status";

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
  variant: { quantityValue: string; unit: string; packCount: number } | null;
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
          product: {
            include: {
              vendor: true,
              category: true,
              images: { take: 1 },
              _count: { select: { variants: { where: { isActive: true } } } },
            },
          },
          variant: { include: { image: true } },
          menuItem: { include: { menu: { include: { vendor: { include: { restaurant: { include: { weeklyHours: true } } } } } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const lines: NormalizedCartLine[] = [];

  for (const item of cart?.items ?? []) {
    if (item.product) {
      const variantOk = !item.variant || (item.variant.isActive && item.variant.stockQty > 0);
      // A product with only one active option must look exactly like it did
      // before variants existed — Product.unit already carries its original
      // free text (backfilled products) or the single option's own label
      // kept in sync (new products), so the computed variant label is only
      // ever shown once there's an actual choice to describe.
      const hasMultipleOptions = item.product._count.variants > 1;
      lines.push({
        id: item.id,
        productId: item.product.id,
        variantId: item.variantId,
        menuItemId: null,
        quantity: item.quantity,
        name: item.product.name,
        unit: item.product.unit,
        variant:
          item.variant && hasMultipleOptions
            ? { quantityValue: item.variant.quantityValue.toString(), unit: item.variant.unit, packCount: item.variant.packCount }
            : null,
        imageUrl: item.variant?.image?.url ?? item.product.images[0]?.url ?? null,
        unitPrice: Number(item.variant ? item.variant.price : item.product.price),
        addOnsTotal: 0,
        selectedAddOns: [],
        specialInstructions: null,
        isAvailable: item.product.isPublished && item.product.availability === "AVAILABLE" && variantOk,
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
        variant: null,
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

  // Captured alongside the lines loop above (only menu-item lines carry a
  // restaurant) so each restaurant group can tell the customer "this will be
  // delivered once X opens" rather than silently allowing a closed-but-
  // scheduling restaurant's item to sit in the cart with no explanation.
  const restaurantStatusByVendorId = new Map<string, RestaurantStatus>();
  for (const item of cart?.items ?? []) {
    const restaurant = item.menuItem?.menu.vendor.restaurant;
    if (restaurant && !restaurantStatusByVendorId.has(item.menuItem!.menu.vendorId)) {
      restaurantStatusByVendorId.set(item.menuItem!.menu.vendorId, getRestaurantStatus(restaurant));
    }
  }

  const groups = new Map<
    string,
    { vendorId: string; vendorSlug: string; vendorBusinessName: string; vendorBusinessType: string; restaurantStatus: RestaurantStatus | null; lines: NormalizedCartLine[] }
  >();
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
        restaurantStatus: restaurantStatusByVendorId.get(line.vendorId) ?? null,
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
