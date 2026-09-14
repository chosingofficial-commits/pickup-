import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { OrderStatusActions } from "@/components/orders/order-status-actions";
import { getCurrentUser } from "@/lib/auth/session";
import { getVendorOrders } from "@/lib/vendor/queries";
import { getAvailableNextStatuses, statusLabel } from "@/lib/orders/status-flow";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

const FILTERS = ["ALL", "ORDER_PLACED", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "RIDER_ASSIGNED", "ON_THE_WAY", "DELIVERED", "CANCELLED"];

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
            key={f}
            href={f === "ALL" ? "/vendor/orders" : `/vendor/orders?status=${f}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              (status ?? "ALL") === f ? "border-brand-primary bg-brand-primary text-white" : "border-border-brand text-brand-dark hover:bg-brand-bg"
            }`}
          >
            {f === "ALL" ? "All" : statusLabel(f as never)}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-gray-500">No orders found.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
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
                </div>
                <div className="text-right">
                  <p className="font-heading font-bold text-brand-dark">{formatBDT(order.total)}</p>
                  <Badge variant={order.status === "DELIVERED" ? "brand" : "accent"}>{statusLabel(order.status)}</Badge>
                </div>
              </div>
              <div className="mt-3">
                <OrderStatusActions orderId={order.id} nextOptions={getAvailableNextStatuses(order.status, businessType, "VENDOR")} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
