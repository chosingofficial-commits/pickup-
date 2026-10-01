import type { Metadata } from "next";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PayoutRequestForm } from "@/components/vendor-dashboard/payout-request-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getVendorDashboardStats } from "@/lib/vendor/queries";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Payouts" };

export default async function VendorPayoutsPage() {
  const user = await getCurrentUser();
  if (!user?.vendorProfile) return null;

  const [stats, payouts, paidAgg] = await Promise.all([
    getVendorDashboardStats(user.vendorProfile.id),
    db.vendorPayout.findMany({ where: { vendorId: user.vendorProfile.id }, orderBy: { requestedAt: "desc" } }),
    db.vendorPayout.aggregate({ where: { vendorId: user.vendorProfile.id, status: "PAID" }, _sum: { amount: true } }),
  ]);

  const available = stats.earnings - stats.pendingPayout - Number(paidAgg._sum.amount ?? 0);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Payouts</h1>

      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-4">Earnings breakdown</CardTitle>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-gray-500">Your earnings</dt>
              <dd className="font-heading text-lg font-bold text-brand-dark">{formatBDT(stats.earnings)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Platform commission</dt>
              <dd className="font-heading text-lg font-bold text-brand-dark">{formatBDT(stats.commissionPaid)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Already paid out</dt>
              <dd className="font-heading text-lg font-bold text-brand-dark">{formatBDT(Number(paidAgg._sum.amount ?? 0))}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Available to withdraw</dt>
              <dd className="font-heading text-lg font-bold text-brand-dark">{formatBDT(Math.max(0, available))}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-gray-500">
            Your earnings = order subtotal minus platform commission, across all your orders. Available to withdraw = earnings minus pending and already-paid payout requests.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-4">Request a payout</CardTitle>
          <PayoutRequestForm available={Math.max(0, available)} />
        </CardContent>
      </Card>

      {payouts.length > 0 && (
        <div className="space-y-2">
          {payouts.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-card border border-border-brand bg-white p-4">
              <div>
                <p className="text-sm font-semibold text-brand-dark">{formatBDT(p.amount)}</p>
                <p className="text-xs text-gray-500">Requested {p.requestedAt.toLocaleDateString("en-BD", { dateStyle: "medium" })}</p>
              </div>
              <Badge variant={p.status === "PAID" ? "brand" : p.status === "REJECTED" ? "danger" : "accent"}>{p.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
