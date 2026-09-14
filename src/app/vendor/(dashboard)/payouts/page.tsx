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
