import type { Metadata } from "next";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { AddMenuForm } from "@/components/vendor-dashboard/add-menu-form";
import { AddMenuItemForm } from "@/components/vendor-dashboard/add-menu-item-form";
import { MenuItemRow } from "@/components/vendor-dashboard/menu-item-row";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Menu" };

export default async function VendorMenuPage() {
  const user = await getCurrentUser();
  if (!user?.vendorProfile || user.vendorProfile.businessType !== "RESTAURANT") return null;

  const menus = await db.restaurantMenu.findMany({
    where: { vendorId: user.vendorProfile.id },
    include: {
      items: {
        orderBy: { createdAt: "desc" },
        include: {
          addOnGroups: { include: { addOns: true } },
          photos: { orderBy: { sortOrder: "asc" } },
          suggestions: { select: { suggestedItemId: true } },
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  // Every item across every menu this vendor owns — the "frequently bought
  // together" picker on each row offers all of them (minus itself), not just
  // ones in the same menu.
  const allItems = menus.flatMap((m) => m.items).map((i) => ({ id: i.id, name: i.name, price: i.price.toString(), imageUrl: i.imageUrl }));

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
                  <MenuItemRow
                    key={item.id}
                    otherItems={allItems.filter((i) => i.id !== item.id)}
                    item={{
                      id: item.id,
                      name: item.name,
                      description: item.description,
                      price: item.price.toString(),
                      compareAtPrice: item.compareAtPrice?.toString() ?? null,
                      imageUrl: item.imageUrl,
                      ingredients: item.ingredients,
                      allergens: item.allergens,
                      isAvailable: item.isAvailable,
                      photos: item.photos.map((p) => p.url),
                      suggestedItemIds: item.suggestions.map((s) => s.suggestedItemId),
                      addOnGroups: item.addOnGroups.map((g) => ({
                        id: g.id,
                        name: g.name,
                        isRequired: g.isRequired,
                        minSelect: g.minSelect,
                        maxSelect: g.maxSelect,
                        addOns: g.addOns.map((a) => ({ id: a.id, name: a.name, priceDelta: a.priceDelta.toString(), isPopular: a.isPopular, isAvailable: a.isAvailable })),
                      })),
                    }}
                  />
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
