import type { Metadata } from "next";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminCouponForm } from "@/components/admin/admin-coupon-form";
import { toggleCouponActiveAction } from "@/lib/actions/admin-coupons";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Coupons" };

export default async function AdminCouponsPage() {
  const coupons = await db.coupon.findMany({ where: { vendorId: null }, orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Platform-wide coupons</h1>

      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-4">Create a coupon</CardTitle>
          <AdminCouponForm />
        </CardContent>
      </Card>

      <div className="space-y-2">
        {coupons.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-card border border-border-brand bg-white p-4">
            <div>
              <p className="text-sm font-semibold text-brand-dark">{c.code}</p>
              <p className="text-xs text-gray-500">
                {c.type === "PERCENTAGE" ? `${Number(c.value)}% off` : `${formatBDT(c.value)} off`} · min {formatBDT(c.minOrderAmount)} · until{" "}
                {c.endsAt.toLocaleDateString("en-BD", { dateStyle: "medium" })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={c.isActive ? "brand" : "outline"}>{c.isActive ? "Active" : "Inactive"}</Badge>
              <form action={toggleCouponActiveAction}>
                <input type="hidden" name="couponId" value={c.id} />
                <button type="submit" className="rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
                  {c.isActive ? "Deactivate" : "Activate"}
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
