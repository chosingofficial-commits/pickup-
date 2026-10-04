import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeliveryTimeline } from "@/components/orders/delivery-timeline";
import { OrderStatusActions } from "@/components/orders/order-status-actions";
import { OrderAdminActions } from "@/components/admin/order-admin-actions";
import { getAvailableNextStatuses, isTerminal, statusLabel } from "@/lib/orders/status-flow";
import { getApprovedRiders } from "@/lib/admin/queries";
import { parseSelectedAddOns } from "@/lib/catalog/order-addons";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Order details" };

const REFUNDABLE_STATUSES = ["DELIVERED", "CANCELLED", "FAILED_DELIVERY"];

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const [order, riders] = await Promise.all([
    db.order.findUnique({
      where: { id: orderId },
      include: {
        vendor: true,
        customer: { select: { id: true, name: true, phone: true } },
        address: { include: { neighbourhood: { include: { town: true } } } },
        items: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
        orderGroup: { select: { payment: true, orders: { select: { id: true } } } },
        couponRedemptions: { include: { coupon: { select: { code: true } } } },
        delivery: { include: { rider: { include: { user: { select: { name: true, phone: true } } } } } },
      },
    }),
    getApprovedRiders(),
  ]);
  if (!order) notFound();

  const payment = order.orderGroup.payment;
  const isMultiVendorGroup = order.orderGroup.orders.length > 1;
  const nextStatusOptions = getAvailableNextStatuses(order.status, order.vendor.businessType, "ADMIN");

  const canCancel = !isTerminal(order.status);
  const canRefund = payment?.status === "PAID" && REFUNDABLE_STATUSES.includes(order.status);
  const canAssignRider = !isTerminal(order.status);

  const coupon = order.couponRedemptions[0];
  const hasDiscount = Number(order.discount) > 0;
  const isFreeDelivery = Number(order.deliveryFee) === 0;
  const hasTax = Number(order.tax) > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-brand-dark">Order {order.orderNumber}</h1>
        <p className="text-sm text-gray-600">
          {order.vendor.businessName} · {order.customer.name} ({order.customer.phone})
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="pt-5">
              <CardTitle className="mb-3">Admin actions</CardTitle>
              <div className="space-y-4">
                <OrderAdminActions
                  orderId={order.id}
                  canCancel={canCancel}
                  canRefund={!!canRefund}
                  canAssignRider={canAssignRider}
                  riders={riders.map((r) => ({ id: r.id, name: r.user.name, phone: r.user.phone }))}
                  currentRiderId={order.delivery?.riderId ?? null}
                  contacts={{
                    customer: { name: order.customer.name, phone: order.customer.phone },
                    vendor: { name: order.vendor.businessName, phone: order.vendor.phone },
                    rider: order.delivery?.rider ? { name: order.delivery.rider.user.name, phone: order.delivery.rider.user.phone } : null,
                  }}
                />
                {nextStatusOptions.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Status override</h3>
                    <OrderStatusActions orderId={order.id} nextOptions={nextStatusOptions} />
                  </div>
                )}
              </div>
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
              <CardTitle className="mb-3">Items &amp; price</CardTitle>
              <div className="space-y-1.5 text-sm">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-gray-700">
                      {item.quantity}× {item.nameSnapshot}
                      {parseSelectedAddOns(item.selectedAddOns).length > 0 && (
                        <span className="block text-xs text-gray-500">+ {parseSelectedAddOns(item.selectedAddOns).map((a) => a.name).join(", ")}</span>
                      )}
                    </span>
                    <span className="text-brand-dark">{formatBDT(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1.5 border-t border-border-brand pt-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Items subtotal</span>
                  <span>{formatBDT(order.subtotal)}</span>
                </div>
                {hasDiscount && (
                  <div className="flex justify-between text-gray-600">
                    <span>{coupon ? `Coupon ${coupon.coupon.code}` : "Discount"}</span>
                    <span>−{formatBDT(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Delivery fee{isFreeDelivery && order.freeDeliveryReason ? ` (${order.freeDeliveryReason})` : ""}</span>
                  <span>{isFreeDelivery ? "Free delivery" : formatBDT(order.deliveryFee)}</span>
                </div>
                {hasTax && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span>{formatBDT(order.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border-brand pt-1.5 text-sm font-bold text-brand-dark">
                  <span>Total</span>
                  <span>{formatBDT(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-1.5 pt-5 text-sm">
              <CardTitle className="mb-2">Order info</CardTitle>
              <p className="text-gray-600">
                Placed: <span className="text-brand-dark">{order.createdAt.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}</span>
              </p>
              {order.scheduledFor && (
                <p className="text-gray-600">
                  Scheduled for: <span className="text-brand-dark">{order.scheduledFor.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}</span>
                </p>
              )}
              <p className="text-gray-600">
                Status: <Badge variant={order.status === "DELIVERED" ? "brand" : "accent"}>{statusLabel(order.status)}</Badge>
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="font-semibold text-brand-dark">{payment ? payment.provider : "COD"}</span>
                {payment && <Badge variant={payment.status === "PAID" ? "brand" : payment.status === "FAILED" || payment.status === "CANCELLED" ? "danger" : "accent"}>{payment.status}</Badge>}
                {payment?.isSandbox && <Badge variant="warning">Sandbox</Badge>}
              </div>
              {payment && (
                <>
                  {isMultiVendorGroup && <p className="text-xs text-gray-500">Payment covers the whole order group, not just this vendor&apos;s order.</p>}
                  {payment.providerRef && <p className="break-all font-mono text-xs text-gray-500">Txn: {payment.providerRef}</p>}
                  {payment.paidAt && <p className="text-xs text-gray-500">Paid: {payment.paidAt.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}</p>}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1 pt-5 text-sm">
              <CardTitle className="mb-2">Customer</CardTitle>
              <p className="text-brand-dark">{order.customer.name}</p>
              <p className="text-gray-600">{order.customer.phone}</p>
              <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Delivery address</p>
              <p className="text-gray-600">
                {order.address.streetOrVillage}, {order.address.neighbourhood?.name}, {order.address.neighbourhood?.town.name}
              </p>
              {order.customerNote && (
                <>
                  <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Customer notes</p>
                  <p className="text-gray-600">{order.customerNote}</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1 pt-5 text-sm">
              <CardTitle className="mb-2">Vendor</CardTitle>
              <p className="text-brand-dark">{order.vendor.businessName}</p>
              <p className="text-gray-600">{order.vendor.phone}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1 pt-5 text-sm">
              <CardTitle className="mb-2">Rider</CardTitle>
              {order.delivery?.rider ? (
                <>
                  <p className="text-brand-dark">{order.delivery.rider.user.name}</p>
                  <p className="text-gray-600">{order.delivery.rider.user.phone}</p>
                </>
              ) : (
                <p className="text-gray-500">Not assigned yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
