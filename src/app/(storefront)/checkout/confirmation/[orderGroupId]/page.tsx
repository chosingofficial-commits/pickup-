import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Order confirmed" };

export default async function CheckoutConfirmationPage({ params }: { params: Promise<{ orderGroupId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orderGroupId } = await params;
  const orderGroup = await db.orderGroup.findUnique({
    where: { id: orderGroupId },
    include: { orders: { include: { vendor: true } }, payment: true },
  });

  if (!orderGroup || orderGroup.customerId !== user.id) notFound();

  const payment = orderGroup.payment;
  const isPaid = payment?.status === "PAID" || payment?.provider === "COD";
  const isFailed = payment?.status === "FAILED" || payment?.status === "CANCELLED";

  return (
    <Container className="flex flex-col items-center py-12 text-center">
      {isFailed ? (
        <XCircle className="h-14 w-14 text-red-500" aria-hidden />
      ) : isPaid ? (
        <CheckCircle2 className="h-14 w-14 text-brand-primary" aria-hidden />
      ) : (
        <Clock className="h-14 w-14 text-amber-500" aria-hidden />
      )}

      <h1 className="mt-4 font-heading text-2xl font-bold text-brand-dark">
        {isFailed ? "Payment failed" : isPaid ? "Order confirmed!" : "Payment pending"}
      </h1>
      <p className="mt-1 max-w-md text-sm text-gray-600">
        {isFailed
          ? "Your payment did not go through. You can try again from your order history."
          : payment?.provider === "COD"
            ? "Your order has been placed. Pay the rider in cash when it arrives."
            : isPaid
              ? "Thanks for your order! We've notified the vendor(s) and will keep you updated."
              : "We're confirming your payment. This page will update once it's verified."}
      </p>

      <p className="mt-3 text-sm text-gray-500">
        Order group <span className="font-semibold text-brand-dark">{orderGroup.groupNumber}</span> · Total{" "}
        {formatBDT(orderGroup.grandTotal)}
      </p>

      <div className="mt-6 w-full max-w-md space-y-2 text-left">
        {orderGroup.orders.map((order) => (
          <Link
            key={order.id}
            href={`/account/orders/${order.id}`}
            className="flex items-center justify-between rounded-card border border-border-brand bg-white p-4 hover:border-brand-primary"
          >
            <div>
              <p className="text-sm font-semibold text-brand-dark">{order.vendor.businessName}</p>
              <p className="text-xs text-gray-500">Order {order.orderNumber}</p>
            </div>
            <span className="text-sm font-semibold text-brand-primary">{formatBDT(order.total)}</span>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex gap-3">
        <Link href="/account/orders" className="rounded-control bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover">
          View my orders
        </Link>
        <Link href="/marketplace" className="rounded-control border border-border-brand px-5 py-3 text-sm font-semibold text-brand-dark hover:bg-brand-bg">
          Continue shopping
        </Link>
      </div>
    </Container>
  );
}
