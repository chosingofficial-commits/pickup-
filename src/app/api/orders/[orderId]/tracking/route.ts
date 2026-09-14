import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getLatestRiderLocation } from "@/lib/rider/location";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await params;
  const order = await db.order.findUnique({ where: { id: orderId }, include: { delivery: true } });

  // Only the customer who placed it, the vendor fulfilling it, or an admin may see the rider assigned to this order.
  const isOwnCustomer = order?.customerId === user.id;
  const isOwnVendor = order != null && user.role === "VENDOR" && user.vendorProfile?.id === order.vendorId;
  const isAdmin = user.role === "ADMIN";
  if (!order || !(isOwnCustomer || isOwnVendor || isAdmin)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!order.delivery || !order.delivery.isTrackingActive) {
    return NextResponse.json({ active: false });
  }

  const latest = await getLatestRiderLocation(order.delivery.id);
  return NextResponse.json({
    active: true,
    rider: latest ? { lat: Number(latest.lat), lng: Number(latest.lng), recordedAt: latest.recordedAt } : null,
    pickup: order.delivery.pickupLat != null ? { lat: Number(order.delivery.pickupLat), lng: Number(order.delivery.pickupLng) } : null,
    drop: order.delivery.dropLat != null ? { lat: Number(order.delivery.dropLat), lng: Number(order.delivery.dropLng) } : null,
    etaMinutes: order.delivery.etaMinutes,
  });
}
