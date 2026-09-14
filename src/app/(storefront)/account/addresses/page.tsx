import type { Metadata } from "next";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { AddressList } from "@/components/account/address-list";
import { AddressForm } from "@/components/checkout/address-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrderableNeighbourhoods } from "@/lib/location/queries";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Saved addresses" };

export default async function AccountAddressesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [addresses, neighbourhoods] = await Promise.all([
    db.address.findMany({
      where: { userId: user.id, deletedAt: null },
      include: { neighbourhood: { include: { town: true } } },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),
    getOrderableNeighbourhoods(),
  ]);

  const addressItems = addresses.map((a) => ({
    id: a.id,
    label: a.label,
    recipientName: a.recipientName,
    recipientPhone: a.recipientPhone,
    streetOrVillage: a.streetOrVillage,
    landmark: a.landmark,
    neighbourhoodName: a.neighbourhood?.name ?? "—",
    townName: a.neighbourhood?.town.name ?? "",
    isDefault: a.isDefault,
  }));

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Saved addresses</h1>
      <AddressList addresses={addressItems} />
      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-4">Add a new address</CardTitle>
          <AddressForm neighbourhoods={neighbourhoods.map((n) => ({ id: n.id, name: n.name, townName: n.town.name }))} />
        </CardContent>
      </Card>
    </div>
  );
}
