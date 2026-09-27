import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wallet, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth/session";
import { getRiderHistory, getRiderDeliveryStats } from "@/lib/rider/queries";
import { getSiteSettings, SITE_SETTING_KEYS } from "@/lib/settings";
import { statusLabel } from "@/lib/orders/status-flow";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Delivery history" };

export default async function RiderHistoryPage() {
  const user = await getCurrentUser();
  // See rider/(dashboard)/page.tsx — unreachable today (layout redirects
  // first), kept as a non-silent fallback.
  if (!user?.riderProfile) redirect("/rider/register");

  const [history, stats, settings] = await Promise.all([
    getRiderHistory(user.riderProfile.id),
    getRiderDeliveryStats(user.riderProfile.id),
    getSiteSettings(),
  ]);

  const rate = Number(settings[SITE_SETTING_KEYS.riderDeliveryRate]);
  const todayEarnings = stats.deliveredToday * rate;

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Delivery history</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-bg text-brand-primary">
              <Wallet className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs text-gray-500">Today&apos;s earnings (est.)</p>
              <p className="font-heading text-lg font-bold text-brand-dark">{formatBDT(todayEarnings)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-bg text-brand-primary">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs text-gray-500">Delivered today</p>
              <p className="font-heading text-lg font-bold text-brand-dark">{stats.deliveredToday}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-bg text-brand-primary">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs text-gray-500">Delivered all-time</p>
              <p className="font-heading text-lg font-bold text-brand-dark">{stats.deliveredTotal}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-gray-500">No completed deliveries yet.</p>
      ) : (
        <div className="space-y-2">
          {history.map((order) => (
            <div key={order.id} className="flex items-center justify-between rounded-card border border-border-brand bg-white p-4">
              <div>
                <p className="text-sm font-semibold text-brand-dark">{order.vendor.businessName}</p>
                <p className="text-xs text-gray-500">{order.customer.name} · {order.orderNumber}</p>
              </div>
              <Badge variant={order.status === "DELIVERED" ? "brand" : "danger"}>{statusLabel(order.status)}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
