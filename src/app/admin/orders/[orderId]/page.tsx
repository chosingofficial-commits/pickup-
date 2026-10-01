import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeliveryTimeline } from "@/components/orders/delivery-timeline";
import { OrderStatusActions } from "@/components/orders/order-status-actions";
import { getAvailableNextStatuses } from "@/lib/orders/status-flow";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Order details" };

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      vendor: true,
      customer: { select: { name: true, phone: true } },
      address: { include: { neighbourhood: { include: { town: true } } } },
      items: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
      orderGroup: { select: { payment: true, orders: { select: { id: true } } } },
    },
  });
  if (!order) notFound();

  const payment = order.orderGroup.payment;
  const isMultiVendorGroup = order.orderGroup.orders.length > 1;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-brand-dark">Order {order.orderNumber}</h1>
        <p className="text-sm text-gray-600">
          {order.vendor.businessName} · {order.customer.name} ({order.customer.phone})
        </p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-3">Admin actions</CardTitle>
          <OrderStatusActions orderId={order.id} nextOptions={getAvailableNextStatuses(order.status, order.vendor.businessType, "ADMIN")} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-3">Payment</CardTitle>
          {payment ? (
            <div className="space-y-1.5 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-brand-dark">{payment.provider}</span>
                <Badge variant={payment.status === "PAID" ? "brand" : payment.status === "FAILED" || payment.status === "CANCELLED" ? "danger" : "accent"}>{payment.status}</Badge>
                {payment.isSandbox && <Badge variant="warning">Sandbox — no real money moved</Badge>}
              </div>
              <p className="text-xs text-gray-500">Amount: {formatBDT(payment.amount)}{isMultiVendorGroup && " (covers the whole order group, not just this vendor's order)"}</p>
              {payment.providerRef && <p className="font-mono text-xs text-gray-500">Transaction ID: {payment.providerRef}</p>}
              {payment.paidAt && <p className="text-xs text-gray-500">Paid: {payment.paidAt.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}</p>}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No payment record found for this order.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-4">Delivery status</CardTitle>
          <DeliveryTimeline businessType={order.vendor.businessType} currentStatus={order.status} history={order.statusHistory} />
        </CardContent>
      </Card>

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
