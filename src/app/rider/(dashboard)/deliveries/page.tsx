import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Phone, MessageCircle, MapPin, Navigation, Store } from "lucide-react";
import { OrderStatusActions } from "@/components/orders/order-status-actions";
import { LocationBroadcaster } from "@/components/rider/location-broadcaster";
import { getCurrentUser } from "@/lib/auth/session";
import { getRiderActiveDeliveries } from "@/lib/rider/queries";
import { getAvailableNextStatuses, statusLabel } from "@/lib/orders/status-flow";
import { directionsUrl } from "@/lib/location/maps-link";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "My deliveries" };

export default async function RiderDeliveriesPage() {
  const user = await getCurrentUser();
  // See rider/(dashboard)/page.tsx — unreachable today (layout redirects
  // first), kept as a non-silent fallback.
  if (!user?.riderProfile) redirect("/rider/register");

  const deliveries = await getRiderActiveDeliveries(user.riderProfile.id);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">My deliveries</h1>

      {deliveries.length === 0 ? (
        <p className="text-sm text-gray-500">You have no active deliveries. Check the Available tab to accept one.</p>
      ) : (
        <div className="space-y-4">
          {deliveries.map((order) => (
            <div key={order.id} className="space-y-3 rounded-card border border-border-brand bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-dark">
                    <Store className="h-4 w-4 text-brand-primary" aria-hidden />
                    {order.vendor.businessName}
                  </p>
                  <p className="text-xs text-gray-500">{order.vendor.addressText}</p>
                </div>
                <span className="rounded-full bg-brand-bg px-2.5 py-1 text-xs font-semibold text-brand-dark">{statusLabel(order.status)}</span>
              </div>

              <div className="flex items-center gap-1.5 text-sm text-gray-700">
                <MapPin className="h-4 w-4 text-brand-primary" aria-hidden />
                {order.address.streetOrVillage}, {order.address.neighbourhood?.name}
              </div>

              <div className="rounded-control bg-surface-muted p-3 text-sm">
                <p className="font-semibold text-brand-dark">{order.customer.name}</p>
                <p className="text-xs text-gray-500">{formatBDT(order.total)} · {order.items.length} item(s)</p>
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  <a
                    href={`tel:${order.customer.phone}`}
                    className="flex h-11 flex-col items-center justify-center gap-0.5 rounded-control border border-border-brand bg-white text-brand-dark hover:bg-brand-bg"
                    aria-label="Call customer"
                  >
                    <Phone className="h-4 w-4" aria-hidden />
                    <span className="text-[11px] font-medium">Call</span>
                  </a>
                  <a
                    href={`https://wa.me/${order.customer.phone.replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 flex-col items-center justify-center gap-0.5 rounded-control border border-border-brand bg-white text-brand-dark hover:bg-brand-bg"
                    aria-label="WhatsApp customer"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    <span className="text-[11px] font-medium">WhatsApp</span>
                  </a>
                  <a
                    href={directionsUrl({
                      lat: order.address.lat,
                      lng: order.address.lng,
                      fallbackQuery: `${order.address.streetOrVillage}, ${order.address.neighbourhood?.name ?? ""}`,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 flex-col items-center justify-center gap-0.5 rounded-control border border-border-brand bg-white text-brand-dark hover:bg-brand-bg"
                    aria-label="Directions to customer"
                  >
                    <Navigation className="h-4 w-4" aria-hidden />
                    <span className="text-[11px] font-medium">Directions</span>
                  </a>
                </div>
              </div>

              {order.delivery && <LocationBroadcaster deliveryId={order.delivery.id} />}

              <OrderStatusActions orderId={order.id} nextOptions={getAvailableNextStatuses(order.status, order.vendor.businessType, "RIDER")} size="lg" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
