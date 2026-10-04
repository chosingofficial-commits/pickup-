import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Phone, MessageCircle } from "lucide-react";
import { DeliveryTimeline } from "@/components/orders/delivery-timeline";
import { WaitBanner } from "@/components/orders/wait-banner";
import { OrderStatusPoller } from "@/components/orders/order-status-poller";
import { CustomerTrackingPanel } from "@/components/orders/customer-tracking-panel";
import { OrderReviewForm } from "@/components/orders/order-review-form";
import { CancelOrderButton } from "@/components/orders/cancel-order-button";
import { RequestRefundForm } from "@/components/orders/request-refund-form";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { getCustomerOrderDetail } from "@/lib/orders/queries";
import { parseSelectedAddOns } from "@/lib/catalog/order-addons";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Order details" };

export default async function AccountOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { orderId } = await params;
  const order = await getCustomerOrderDetail(user.id, orderId);
  if (!order) notFound();

  const canCancel = order.status === "ORDER_PLACED" || order.status === "CONFIRMED";
  const canReview = order.status === "DELIVERED" && order.reviews.length === 0;
  const canRequestRefund = order.status === "DELIVERED" || order.status === "CANCELLED" || order.status === "FAILED_DELIVERY";
  const rider = order.delivery?.rider;

  return (
    <div className="space-y-6">
      <OrderStatusPoller
        orderId={order.id}
        initialStatus={order.status}
        initialVendorWaitUntil={order.vendorWaitUntil ? order.vendorWaitUntil.toISOString() : null}
      />
      <div>
        <h1 className="font-heading text-2xl font-bold text-brand-dark">Order {order.orderNumber}</h1>
        <p className="text-sm text-gray-600">{order.vendor.businessName}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {order.status === "ORDER_PLACED" && order.vendorWaitUntil && (
            <WaitBanner waitUntil={order.vendorWaitUntil.toISOString()} />
          )}

          <Card>
            <CardContent className="pt-5">
              <CardTitle className="mb-4">Delivery status</CardTitle>
              <DeliveryTimeline businessType={order.vendor.businessType} currentStatus={order.status} history={order.statusHistory} />
            </CardContent>
          </Card>

          {rider && order.delivery?.isTrackingActive && (
            <Card>
              <CardContent className="pt-5">
                <CardTitle className="mb-3">Your rider</CardTitle>
                <div className="mb-3">
                  <CustomerTrackingPanel orderId={order.id} vendorName={order.vendor.businessName} />
                </div>
                <p className="text-sm font-semibold text-brand-dark">{rider.user.name}</p>
                <div className="mt-2 flex gap-2">
                  <a href={`tel:${rider.user.phone}`} className="flex items-center gap-1.5 rounded-control border border-border-brand px-3.5 py-2 text-sm font-medium text-brand-dark hover:bg-brand-bg">
                    <Phone className="h-4 w-4" aria-hidden />
                    Call
                  </a>
                  <a
                    href={`https://wa.me/${rider.user.phone.replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-control border border-border-brand px-3.5 py-2 text-sm font-medium text-brand-dark hover:bg-brand-bg"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    WhatsApp
                  </a>
                </div>
              </CardContent>
            </Card>
          )}

          {canReview && (
            <Card>
              <CardContent className="pt-5">
                <CardTitle className="mb-3">Leave a review</CardTitle>
                <OrderReviewForm orderId={order.id} />
              </CardContent>
            </Card>
          )}

          {canCancel && (
            <Card>
              <CardContent className="pt-5">
                <CancelOrderButton orderId={order.id} />
              </CardContent>
            </Card>
          )}

          {canRequestRefund && (
            <Card>
              <CardContent className="pt-5">
                <CardTitle className="mb-3">Need a refund?</CardTitle>
                <RequestRefundForm orderId={order.id} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5">
              <CardTitle className="mb-3">Items</CardTitle>
              <div className="space-y-2 text-sm">
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
              <dl className="mt-3 space-y-1 border-t border-border-brand pt-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Subtotal</dt>
                  <dd>{formatBDT(order.subtotal)}</dd>
                </div>
                {Number(order.discount) > 0 && (
                  <div className="flex justify-between text-brand-primary">
                    <dt>Discount</dt>
                    <dd>-{formatBDT(order.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-600">Delivery</dt>
                  <dd>{formatBDT(order.deliveryFee)}</dd>
                </div>
                <div className="flex justify-between border-t border-border-brand pt-1.5 font-bold text-brand-dark">
                  <dt>Total</dt>
                  <dd>{formatBDT(order.total)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <CardTitle className="mb-2">Delivery address</CardTitle>
              <p className="text-sm text-gray-600">
                {order.address.recipientName} · {order.address.recipientPhone}
                <br />
                {order.address.streetOrVillage}, {order.address.neighbourhood?.name}, {order.address.neighbourhood?.town.name}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
