import type { Metadata } from "next";
import { NotificationsPanel } from "@/components/notifications/notifications-panel";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Notifications" };

export default async function VendorNotificationsPage() {
  const user = await getCurrentUser();
  if (!user?.vendorProfile) return null;

  const notifications = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Notifications</h1>
      <NotificationsPanel notifications={notifications} />
    </div>
  );
}
