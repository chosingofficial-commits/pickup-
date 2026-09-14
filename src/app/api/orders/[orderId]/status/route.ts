import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

/** Polled by the customer's order-detail page while an order is still ORDER_PLACED, so Accept/Wait from the vendor shows up without a manual refresh. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await params;
  const order = await db.order.findUnique({ where: { id: orderId }, select: { customerId: true, status: true, vendorWaitUntil: true } });
  if (!order || order.customerId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ status: order.status, vendorWaitUntil: order.vendorWaitUntil });
}
