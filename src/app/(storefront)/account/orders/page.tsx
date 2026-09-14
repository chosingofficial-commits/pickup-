import type { Metadata } from "next";
import Link from "next/link";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth/session";
import { getCustomerOrders } from "@/lib/orders/queries";
import { statusLabel } from "@/lib/orders/status-flow";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "My orders" };

export default async function AccountOrdersPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const orders = await getCustomerOrders(user.id);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">My orders</h1>

      {orders.length === 0 ? (
        <div className="rounded-card border border-border-brand bg-white p-10 text-center">
          <Package className="mx-auto h-10 w-10 text-gray-300" aria-hidden />
          <p className="mt-2 text-sm text-gray-600">You haven&apos;t placed any orders yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="flex items-center justify-between rounded-card border border-border-brand bg-white p-4 hover:border-brand-primary"
            >
              <div>
                <p className="text-sm font-semibold text-brand-dark">{order.vendor.businessName}</p>
                <p className="text-xs text-gray-500">
                  {order.orderNumber} · {order.items.length} item{order.items.length === 1 ? "" : "s"} ·{" "}
                  {order.createdAt.toLocaleDateString("en-BD", { dateStyle: "medium" })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-brand-dark">{formatBDT(order.total)}</span>
                <Badge variant={order.status === "DELIVERED" ? "brand" : order.status.includes("CANCEL") ? "danger" : "accent"}>
                  {statusLabel(order.status)}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
