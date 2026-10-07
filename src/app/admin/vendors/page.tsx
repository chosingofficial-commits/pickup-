import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CommissionRateEditor } from "@/components/admin/commission-rate-editor";
import { toggleVendorSuspensionAction } from "@/lib/actions/admin-vendors";
import { db } from "@/lib/db";
import type { Vendor } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Vendors & restaurants" };

type VendorWithCounts = Vendor & { _count: { orders: number; products: number }; menuItemCount: number };

function VendorRow({ vendor }: { vendor: VendorWithCounts }) {
  const isRestaurant = vendor.businessType === "RESTAURANT";
  const catalogLabel = isRestaurant
    ? `${vendor.menuItemCount} menu item${vendor.menuItemCount === 1 ? "" : "s"}`
    : `${vendor._count.products} product${vendor._count.products === 1 ? "" : "s"}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border-brand bg-white p-4">
      <Link href={`/admin/vendors/${vendor.id}`} className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-brand-dark hover:text-brand-primary hover:underline">{vendor.businessName}</p>
        <p className="text-xs text-gray-500">
          {vendor._count.orders} orders · {catalogLabel}
        </p>
      </Link>
      <div className="flex items-center gap-3">
        <CommissionRateEditor vendorId={vendor.id} value={Number(vendor.commissionRatePct)} />
        <Badge variant={vendor.isSuspended ? "danger" : "brand"}>{vendor.isSuspended ? "Suspended" : "Active"}</Badge>
        <form action={toggleVendorSuspensionAction}>
          <input type="hidden" name="vendorId" value={vendor.id} />
          <button type="submit" className="rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
            {vendor.isSuspended ? "Unsuspend" : "Suspend"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function AdminVendorsPage() {
  const vendorsRaw = await db.vendor.findMany({
    where: { deletedAt: null },
    include: { _count: { select: { orders: true, products: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Restaurants catalog through MenuItem (via RestaurantMenu), not Product —
  // _count.products above is always 0 for them, which used to be shown
  // verbatim as "0 products" instead of their actual menu size.
  const menuItemCounts = await db.menuItem.groupBy({
    by: ["menuId"],
    where: { deletedAt: null, menu: { vendorId: { in: vendorsRaw.filter((v) => v.businessType === "RESTAURANT").map((v) => v.id) } } },
    _count: { _all: true },
  });
  const menusByVendor = await db.restaurantMenu.findMany({
    where: { vendorId: { in: vendorsRaw.filter((v) => v.businessType === "RESTAURANT").map((v) => v.id) } },
    select: { id: true, vendorId: true },
  });
  const countByMenuId = new Map(menuItemCounts.map((m) => [m.menuId, m._count._all]));
  const menuItemCountByVendor = new Map<string, number>();
  for (const menu of menusByVendor) {
    const current = menuItemCountByVendor.get(menu.vendorId) ?? 0;
    menuItemCountByVendor.set(menu.vendorId, current + (countByMenuId.get(menu.id) ?? 0));
  }

  const vendors: VendorWithCounts[] = vendorsRaw.map((v) => ({ ...v, menuItemCount: menuItemCountByVendor.get(v.id) ?? 0 }));

  const restaurants = vendors.filter((v) => v.businessType === "RESTAURANT");
  const groceryVendors = vendors.filter((v) => v.businessType === "GROCERY_VENDOR");

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Vendors & restaurants</h1>

      <div className="space-y-3">
        <h2 className="font-heading text-lg font-bold text-brand-dark">Grocery vendors ({groceryVendors.length})</h2>
        {groceryVendors.length === 0 ? (
          <p className="text-sm text-gray-500">No grocery vendors yet.</p>
        ) : (
          <div className="space-y-2">
            {groceryVendors.map((vendor) => (
              <VendorRow key={vendor.id} vendor={vendor} />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="font-heading text-lg font-bold text-brand-dark">Restaurants ({restaurants.length})</h2>
        {restaurants.length === 0 ? (
          <p className="text-sm text-gray-500">No restaurants yet.</p>
        ) : (
          <div className="space-y-2">
            {restaurants.map((vendor) => (
              <VendorRow key={vendor.id} vendor={vendor} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
