import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/orders/status-flow";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;

  const orders = await db.order.findMany({
    where: status && status !== "ALL" ? { status: status as never } : {},
    include: {
      vendor: { select: { businessName: true } },
      customer: { select: { name: true } },
      orderGroup: { select: { payment: { select: { provider: true, status: true, isSandbox: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Orders</h1>
      <div className="overflow-x-auto rounded-card border border-border-brand bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-border-brand bg-surface-muted text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const payment = order.orderGroup.payment;
              return (
                <tr key={order.id} className="border-b border-border-brand last:border-0 hover:bg-brand-bg">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${order.id}`} className="font-medium text-brand-dark hover:text-brand-primary">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{order.vendor.businessName}</td>
                  <td className="px-4 py-3 text-gray-600">{order.customer.name}</td>
                  <td className="px-4 py-3 font-semibold text-brand-dark">{formatBDT(order.total)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
                      <span>{payment?.provider === "COD" || !payment ? "COD" : payment.provider}</span>
                      {payment?.isSandbox && <Badge variant="warning">Sandbox</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={order.status === "DELIVERED" ? "brand" : "accent"}>{statusLabel(order.status)}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
