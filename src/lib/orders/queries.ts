import "server-only";
import { db } from "@/lib/db";

export async function getCustomerOrders(userId: string) {
  return db.order.findMany({
    where: { customerId: userId },
    include: { vendor: true, items: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCustomerOrderDetail(userId: string, orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      vendor: true,
      address: { include: { neighbourhood: { include: { town: true } } } },
      items: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
      delivery: { include: { rider: { include: { user: { select: { name: true, phone: true } } } } } },
      reviews: true,
    },
  });
  if (!order || order.customerId !== userId) return null;
  return order;
}
