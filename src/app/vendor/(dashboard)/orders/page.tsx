import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { OrderStatusActions } from "@/components/orders/order-status-actions";
import { FindRiderButton } from "@/components/orders/find-rider-button";
import { getCurrentUser } from "@/lib/auth/session";
import { getVendorOrders } from "@/lib/vendor/queries";
import { getAvailableNextStatuses, statusLabel } from "@/lib/orders/status-flow";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

const FILTERS: { key: string; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "PENDING", label: "Pending" },
  { key: "ORDER_PLACED", label: statusLabel("ORDER_PLACED") },
  { key: "CONFIRMED", label: statusLabel("CONFIRMED") },
  { key: "PREPARING", label: statusLabel("PREPARING") },
  { key: "READY_FOR_PICKUP", label: statusLabel("READY_FOR_PICKUP") },
  { key: "RIDER_ASSIGNED", label: statusLabel("RIDER_ASSIGNED") },
  { key: "ON_THE_WAY", label: statusLabel("ON_THE_WAY") },
  { key: "DELIVERED", label: statusLabel("DELIVERED") },
  { key: "CANCELLED", label: statusLabel("CANCELLED") },
];

export default async function VendorOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await getCurrentUser();
  if (!user?.vendorProfile) return null;

  const { status } = await searchParams;
  const orders = await getVendorOrders(user.vendorProfile.id, status);
  const businessType = user.vendorProfile.businessType;

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Orders</h1>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "ALL" ? "/vendor/orders" : `/vendor/orders?status=${f.key}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              (status ?? "ALL") === f.key ? "border-brand-primary bg-brand-primary text-white" : "border-border-brand text-brand-dark hover:bg-brand-bg"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-gray-500">No orders found.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const readyStatus = businessType === "RESTAURANT" ? "READY_FOR_PICKUP" : "PREPARING";
            const canFindRider = order.status === readyStatus && !order.delivery?.riderId;
            return (
              <div key={order.id} className="rounded-card border border-border-brand bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link href={`/vendor/orders/${order.id}`} className="text-sm font-semibold text-brand-dark hover:text-brand-primary">
                      {order.orderNumber}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {order.customer.name} · {order.customer.phone} · {order.address.neighbourhood?.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      {order.items.map((i) => `${i.quantity}× ${i.nameSnapshot}`).join(", ")}
                    </p>
                    {order.delivery?.rider ? (
                      <p className="mt-1 text-xs font-semibold text-brand-primary">Rider: {order.delivery.rider.user.name}</p>
                    ) : order.delivery?.riderSearchStartedAt ? (
                      <p className="mt-1 text-xs text-gray-500">Searching for a rider…</p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="font-heading font-bold text-brand-dark">{formatBDT(order.total)}</p>
                    <Badge variant={order.status === "DELIVERED" ? "brand" : "accent"}>{statusLabel(order.status)}</Badge>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <OrderStatusActions orderId={order.id} nextOptions={getAvailableNextStatuses(order.status, businessType, "VENDOR")} />
                  {canFindRider && <FindRiderButton orderId={order.id} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
