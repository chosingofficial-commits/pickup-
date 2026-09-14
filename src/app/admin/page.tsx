import type { Metadata } from "next";
import Link from "next/link";
import { DollarSign, ShoppingBag, Users, Store, FileClock, Bike, Percent, Undo2, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SalesChart } from "@/components/admin/sales-chart";
import { getAdminOverviewStats, getRecentAuditLogs, getDailySalesSeries } from "@/lib/admin/queries";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin dashboard" };

function Stat({ icon: Icon, label, value, href }: { icon: React.ElementType; label: string; value: string; href: string }) {
  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-lifted">
        <CardContent className="flex items-center gap-3 pt-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-bg text-brand-primary">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="font-heading text-lg font-bold text-brand-dark">{value}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function AdminOverviewPage() {
  const [stats, logs, series] = await Promise.all([getAdminOverviewStats(), getRecentAuditLogs(), getDailySalesSeries()]);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Admin dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={DollarSign} label="Total sales" value={formatBDT(stats.totalSales)} href="/admin/orders" />
        <Stat icon={ShoppingBag} label="Total orders" value={String(stats.totalOrders)} href="/admin/orders" />
        <Stat icon={Users} label="Customers" value={String(stats.totalCustomers)} href="/admin/customers" />
        <Stat icon={Store} label="Active vendors" value={String(stats.activeVendors)} href="/admin/vendors" />
        <Stat icon={FileClock} label="Pending applications" value={String(stats.pendingApplications)} href="/admin/vendor-applications" />
        <Stat icon={Bike} label="Riders" value={String(stats.totalRiders)} href="/admin/riders" />
        <Stat icon={Percent} label="Commission revenue" value={formatBDT(stats.commissionRevenue)} href="/admin/payouts" />
        <Stat icon={Undo2} label="Pending refunds" value={String(stats.pendingRefunds)} href="/admin/refunds" />
        <Stat icon={Wallet} label="Pending payouts" value={String(stats.pendingPayouts)} href="/admin/payouts" />
      </div>

      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-4 font-heading text-base font-bold text-brand-dark">Sales, last 14 days (delivered orders)</h2>
          <SalesChart series={series} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-3 font-heading text-base font-bold text-brand-dark">Recent activity</h2>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-500">No activity yet.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between border-b border-border-brand py-2 text-sm last:border-0">
                  <span className="text-gray-700">
                    {log.actorUser?.name ?? "System"} · {log.action.replaceAll("_", " ").toLowerCase()}
                  </span>
                  <span className="text-xs text-gray-400">{log.createdAt.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
