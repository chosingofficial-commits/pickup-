import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { markNotificationReadAction } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

export default async function AccountNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const notifications = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Notifications</h1>
      {notifications.length === 0 ? (
        <div className="rounded-card border border-border-brand bg-white p-10 text-center">
          <Bell className="mx-auto h-10 w-10 text-gray-300" aria-hidden />
          <p className="mt-2 text-sm text-gray-600">You&apos;re all caught up.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <form key={n.id} action={markNotificationReadAction}>
              <input type="hidden" name="id" value={n.id} />
              <button
                type="submit"
                disabled={n.isRead}
                className={cn(
                  "w-full rounded-card border p-4 text-left",
                  n.isRead ? "border-border-brand bg-white" : "border-brand-primary bg-brand-bg",
                )}
              >
                <p className="text-sm font-semibold text-brand-dark">{n.title}</p>
                <p className="mt-0.5 text-sm text-gray-600">{n.body}</p>
                <p className="mt-1 text-xs text-gray-400">{n.createdAt.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}</p>
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
