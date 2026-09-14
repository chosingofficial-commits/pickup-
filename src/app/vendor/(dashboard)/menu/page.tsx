import type { Metadata } from "next";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/product/product-image";
import { AddMenuForm } from "@/components/vendor-dashboard/add-menu-form";
import { AddMenuItemForm } from "@/components/vendor-dashboard/add-menu-item-form";
import { toggleMenuItemAvailabilityAction, deleteMenuItemAction } from "@/lib/actions/vendor-menu";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Menu" };

export default async function VendorMenuPage() {
  const user = await getCurrentUser();
  if (!user?.vendorProfile || user.vendorProfile.businessType !== "RESTAURANT") return null;

  const menus = await db.restaurantMenu.findMany({
    where: { vendorId: user.vendorProfile.id },
    include: { items: { orderBy: { createdAt: "desc" } } },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Menu</h1>

      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-4">Add a menu</CardTitle>
          <AddMenuForm />
        </CardContent>
      </Card>

      {menus.map((menu) => (
        <Card key={menu.id}>
          <CardContent className="space-y-4 pt-5">
            <CardTitle>{menu.name}</CardTitle>

            {menu.items.length > 0 && (
              <div className="space-y-2">
                {menu.items.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-control border border-border-brand p-3">
                    <ProductImage src={item.imageUrl} alt={item.name} categorySlug="restaurant" className="h-12 w-12 shrink-0 rounded-control" emoji="🍽️" />
                    <div className="min-w-[140px] flex-1">
                      <p className="text-sm font-semibold text-brand-dark">{item.name}</p>
                      <p className="text-xs text-gray-500">{formatBDT(item.price)}</p>
                    </div>
                    <Badge variant={item.isAvailable ? "brand" : "outline"}>{item.isAvailable ? "Available" : "Unavailable"}</Badge>
                    <form action={toggleMenuItemAvailabilityAction}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <button type="submit" className="rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
                        {item.isAvailable ? "Mark unavailable" : "Mark available"}
                      </button>
                    </form>
                    <form action={deleteMenuItemAction}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <button type="submit" className="rounded-control border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                        Delete
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}

            <AddMenuItemForm menuId={menu.id} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
