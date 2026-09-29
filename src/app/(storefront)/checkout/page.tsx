import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import { Container } from "@/components/ui/container";
import { CheckoutSteps } from "@/components/checkout/checkout-steps";
import { AddressForm } from "@/components/checkout/address-form";
import { selectCheckoutAddressAction } from "@/lib/actions/address";
import { getCurrentUser } from "@/lib/auth/session";
import { getFullCart } from "@/lib/cart/queries";
import { getOrderableNeighbourhoods } from "@/lib/location/queries";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Checkout — Delivery address" };

export default async function CheckoutAddressPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkout");

  const { groups } = await getFullCart(user.id);
  if (groups.length === 0) redirect("/cart");

  const [addresses, neighbourhoods] = await Promise.all([
    db.address.findMany({
      where: { userId: user.id, deletedAt: null },
      include: { neighbourhood: { include: { town: true } }, deliveryZone: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),
    getOrderableNeighbourhoods(),
  ]);

  const neighbourhoodOptions = neighbourhoods.map((n) => ({ id: n.id, name: n.name, townName: n.town.name }));

  return (
    <Container className="py-8">
      <CheckoutSteps current="address" />
      <div className="mx-auto max-w-lg">
        <h1 className="font-heading text-xl font-bold text-brand-dark">Delivery address</h1>
        <p className="mt-1 text-sm text-gray-600">Confirmed as {user.name} · {user.phone}</p>

        {addresses.length > 0 && (
          <div className="mt-5 space-y-3">
            {addresses.map((addr) => {
              const covered = addr.deliveryZone?.isActive ?? false;
              return (
                <form key={addr.id} action={selectCheckoutAddressAction}>
                  <input type="hidden" name="addressId" value={addr.id} />
                  <button
                    type="submit"
                    disabled={!covered}
                    className="flex w-full items-start gap-3 rounded-card border border-border-brand bg-white p-4 text-left hover:border-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" aria-hidden />
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-brand-dark">
                        {addr.label} · {addr.recipientName}
                      </span>
                      <span className="block text-xs text-gray-500">
                        {addr.streetOrVillage}, {addr.neighbourhood?.name}, {addr.neighbourhood?.town.name}
                      </span>
                      {!covered && <span className="block text-xs font-medium text-red-600">Outside current coverage</span>}
                    </span>
                  </button>
                </form>
              );
            })}
          </div>
        )}

        <div className="mt-6 rounded-card border border-border-brand bg-white p-5">
          <h2 className="mb-4 font-heading text-sm font-bold text-brand-dark">Add a new address</h2>
          <AddressForm neighbourhoods={neighbourhoodOptions} checkoutRedirect />
        </div>
      </div>
    </Container>
  );
}
