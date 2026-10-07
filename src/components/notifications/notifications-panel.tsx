import { Bell } from "lucide-react";
import { markNotificationReadAction } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";
import type { Notification } from "@/generated/prisma/client";

/** The notifications list itself — shared by the customer account area and the vendor/rider dashboards, so none of them can drift out of sync. */
export function NotificationsPanel({ notifications }: { notifications: Notification[] }) {
  if (notifications.length === 0) {
    return (
      <div className="rounded-card border border-border-brand bg-white p-10 text-center">
        <Bell className="mx-auto h-10 w-10 text-gray-300" aria-hidden />
        <p className="mt-2 text-sm text-gray-600">You&apos;re all caught up.</p>
      </div>
    );
  }

  return (
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
  );
}
