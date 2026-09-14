import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

/** Polled by the vendor dashboard's incoming-order alert to know what's still waiting on Accept/Reject. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR" || !user.vendorProfile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await db.order.findMany({
    where: {
      vendorId: user.vendorProfile.id,
      status: "ORDER_PLACED",
      OR: [{ vendorWaitUntil: null }, { vendorWaitUntil: { lte: new Date() } }],
    },
    orderBy: { createdAt: "asc" },
    take: 10,
    include: {
      customer: { select: { name: true } },
      address: { select: { label: true, streetOrVillage: true } },
      _count: { select: { items: true } },
    },
  });

  return NextResponse.json(
    orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      itemCount: o._count.items,
      total: o.total.toString(),
      customerName: o.customer.name,
      addressLabel: o.address ? `${o.address.label} · ${o.address.streetOrVillage}` : "",
    })),
  );
}
