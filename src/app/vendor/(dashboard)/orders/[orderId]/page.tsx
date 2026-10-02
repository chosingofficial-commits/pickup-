import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { DeliveryTimeline } from "@/components/orders/delivery-timeline";
import { OrderStatusActions } from "@/components/orders/order-status-actions";
import { FindRiderButton } from "@/components/orders/find-rider-button";
import { CustomerTrackingPanel } from "@/components/orders/customer-tracking-panel";
import { getCurrentUser } from "@/lib/auth/session";
import { getVendorOrderDetail } from "@/lib/vendor/queries";
import { getAvailableNextStatuses } from "@/lib/orders/status-flow";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Order details" };

export default async function VendorOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const user = await getCurrentUser();
  if (!user?.vendorProfile) return null;

  const { orderId } = await params;
  const order = await getVendorOrderDetail(user.vendorProfile.id, orderId);
  if (!order) notFound();

  const businessType = user.vendorProfile.businessType;
  const readyStatus = businessType === "RESTAURANT" ? "READY_FOR_PICKUP" : "PREPARING";
  const canFindRider = order.status === readyStatus && !order.delivery?.riderId;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-brand-dark">Order {order.orderNumber}</h1>
        <p className="text-sm text-gray-600">
          {order.customer.name} · {order.customer.phone}
        </p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-3">Update status</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusActions orderId={order.id} nextOptions={getAvailableNextStatuses(order.status, businessType, "VENDOR")} />
            {canFindRider && <FindRiderButton orderId={order.id} />}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-3">Rider</CardTitle>
          {order.delivery?.rider ? (
            <div className="text-sm">
              <p className="font-semibold text-brand-dark">{order.delivery.rider.user.name}</p>
              <p className="text-gray-600">{order.delivery.rider.user.phone}</p>
            </div>
          ) : order.delivery?.riderSearchStartedAt ? (
            <p className="text-sm text-gray-500">Searching for a rider…</p>
          ) : (
            <p className="text-sm text-gray-500">Not searching yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-4">Delivery status</CardTitle>
          <DeliveryTimeline businessType={businessType} currentStatus={order.status} history={order.statusHistory} />
        </CardContent>
      </Card>

      {order.delivery && (
        <Card>
          <CardContent className="pt-5">
            <CardTitle className="mb-3">Live location</CardTitle>
            <CustomerTrackingPanel orderId={order.id} vendorName={order.vendor.businessName} dropLabel={order.customer.name} />
            <p className="mt-2 text-xs text-gray-500">Appears once a rider is assigned and sharing their location.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-3">Items</CardTitle>
          <div className="space-y-1.5 text-sm">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span className="text-gray-700">
                  {item.quantity}× {item.nameSnapshot}
                </span>
                <span className="text-brand-dark">{formatBDT(item.lineTotal)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between border-t border-border-brand pt-3 text-sm font-bold text-brand-dark">
            <span>Total</span>
            <span>{formatBDT(order.total)}</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Commission ({Number(order.commissionRatePct)}%): {formatBDT(order.commissionAmount)} · Your earnings: {formatBDT(order.vendorEarnings)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-2">Delivery address</CardTitle>
          <p className="text-sm text-gray-600">
            {order.address.streetOrVillage}, {order.address.neighbourhood?.name}, {order.address.neighbourhood?.town.name}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
