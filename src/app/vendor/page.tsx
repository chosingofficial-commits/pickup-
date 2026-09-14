import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag, TrendingUp, Percent, Wallet, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { getCurrentUser } from "@/lib/auth/session";
import { getVendorDashboardStats, getVendorOrders } from "@/lib/vendor/queries";
import { statusLabel } from "@/lib/orders/status-flow";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Vendor dashboard" };

export default async function VendorDashboardPage() {
  const user = await getCurrentUser();
  if (!user?.vendorProfile) return null;

  const [stats, recentOrders] = await Promise.all([
    getVendorDashboardStats(user.vendorProfile.id),
    getVendorOrders(user.vendorProfile.id).then((o) => o.slice(0, 8)),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Welcome back, {user.name.split(" ")[0]}</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard icon={ShoppingBag} label="Total orders" value={String(stats.totalOrders)} href="/vendor/orders" />
        <StatCard icon={TrendingUp} label="Revenue (delivered)" value={formatBDT(stats.revenue)} href="/vendor/orders?status=DELIVERED" />
        <StatCard icon={Percent} label="Platform commission" value={formatBDT(stats.commissionPaid)} href="/vendor/payouts" />
        <StatCard icon={Wallet} label="Your earnings" value={formatBDT(stats.earnings)} href="/vendor/payouts" />
        <StatCard icon={Clock} label="Pending orders" value={String(stats.pendingOrders)} href="/vendor/orders?status=ORDER_PLACED" />
      </div>

      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-3 font-heading text-base font-bold text-brand-dark">What these numbers mean</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-semibold text-brand-dark">Total orders</dt>
              <dd className="text-gray-600">Every order you&apos;ve received, at any stage, except ones that were cancelled or failed delivery.</dd>
            </div>
            <div>
              <dt className="font-semibold text-brand-dark">Revenue (delivered)</dt>
              <dd className="text-gray-600">The full order total (items + delivery fee) for orders that have actually been delivered — not yet-in-progress ones.</dd>
            </div>
            <div>
              <dt className="font-semibold text-brand-dark">Platform commission</dt>
              <dd className="text-gray-600">
                Pick Up&apos;s cut, calculated at your commission rate as each order is placed — this adds up across all your orders, not only delivered ones.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-brand-dark">Your earnings</dt>
              <dd className="text-gray-600">Order subtotal minus platform commission — what you&apos;re owed before requesting a payout. Same all-orders basis as commission above.</dd>
            </div>
            <div>
              <dt className="font-semibold text-brand-dark">Pending orders</dt>
              <dd className="text-gray-600">Orders placed, confirmed, preparing, or ready for pickup — anything still waiting on you before a rider takes over.</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-base font-bold text-brand-dark">Recent orders</h2>
            <Link href="/vendor/orders" className="text-sm font-semibold text-brand-primary hover:underline">
              View all
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-gray-500">No orders yet.</p>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/vendor/orders/${order.id}`}
                  className="flex items-center justify-between rounded-control border border-border-brand p-3 text-sm hover:border-brand-primary"
                >
                  <div>
                    <p className="font-medium text-brand-dark">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500">
                      {order.customer.name}
                      {order.address.neighbourhood?.name && ` · ${order.address.neighbourhood.name}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-brand-dark">{formatBDT(order.total)}</p>
                    <p className="text-xs text-gray-500">{statusLabel(order.status)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
