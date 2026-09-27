import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Package, MapPin, CheckCircle2, Wallet, Star } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { OrderStatusActions } from "@/components/orders/order-status-actions";
import { getCurrentUser } from "@/lib/auth/session";
import { getAvailableAssignments, getRiderDeliveryStats } from "@/lib/rider/queries";
import { getAvailableNextStatuses, statusLabel } from "@/lib/orders/status-flow";
import { getSiteSettings, SITE_SETTING_KEYS } from "@/lib/settings";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Rider dashboard" };

export default async function RiderAvailablePage() {
  const user = await getCurrentUser();
  // The layout above this page already redirects anyone without an approved
  // rider profile, so this is unreachable in practice today — kept as a
  // non-silent fallback (never a blank page) in case that guard ever changes.
  if (!user?.riderProfile) redirect("/rider/register");

  const [assignments, stats, settings, riderProfile] = await Promise.all([
    getAvailableAssignments(),
    getRiderDeliveryStats(user.riderProfile.id),
    getSiteSettings(),
    db.riderProfile.findUnique({ where: { id: user.riderProfile.id }, select: { ratingAvg: true, ratingCount: true } }),
  ]);

  const rate = Number(settings[SITE_SETTING_KEYS.riderDeliveryRate]);
  const todayEarnings = stats.deliveredToday * rate;
  const totalEarnings = stats.deliveredTotal * rate;
  const rating = riderProfile && riderProfile.ratingCount > 0 ? `${Number(riderProfile.ratingAvg).toFixed(1)} (${riderProfile.ratingCount})` : "No ratings yet";

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Welcome back, {user.name.split(" ")[0]}</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard icon={Package} label="Total deliveries" value={String(stats.deliveredTotal)} />
        <StatCard icon={CheckCircle2} label="Delivered today" value={String(stats.deliveredToday)} />
        <StatCard icon={Wallet} label="Today's earnings (est.)" value={formatBDT(todayEarnings)} />
        <StatCard icon={Wallet} label="Total earnings (est.)" value={formatBDT(totalEarnings)} />
        <StatCard icon={Star} label="Rating" value={rating} />
      </div>

      <div>
        <h2 className="mb-3 font-heading text-lg font-bold text-brand-dark">Available deliveries</h2>

        {assignments.length === 0 ? (
          <div className="rounded-card border border-border-brand bg-white p-10 text-center">
            <Package className="mx-auto h-10 w-10 text-gray-300" aria-hidden />
            <p className="mt-2 text-sm text-gray-600">No deliveries are ready for pickup right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((order) => (
              <div key={order.id} className="rounded-card border border-border-brand bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-brand-dark">{order.vendor.businessName}</p>
                    <p className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3.5 w-3.5" aria-hidden />
                      Deliver to {order.address.neighbourhood?.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">{order.items.length} item(s) · {formatBDT(order.total)}</p>
                  </div>
                  <span className="rounded-full bg-brand-bg px-2.5 py-1 text-xs font-semibold text-brand-dark">{statusLabel(order.status)}</span>
                </div>
                <div className="mt-3">
                  <OrderStatusActions orderId={order.id} nextOptions={getAvailableNextStatuses(order.status, order.vendor.businessType, "RIDER")} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
