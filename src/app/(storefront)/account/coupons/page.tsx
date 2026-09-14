import type { Metadata } from "next";
import { Ticket } from "lucide-react";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Coupons" };

export default async function AccountCouponsPage() {
  const now = new Date();
  const coupons = await db.coupon.findMany({
    where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now }, vendorId: null },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Coupons</h1>
      {coupons.length === 0 ? (
        <p className="text-sm text-gray-600">No active coupons right now — check back soon.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="flex items-start gap-3 rounded-card border-2 border-dashed border-brand-primary bg-brand-bg p-4">
              <Ticket className="mt-0.5 h-6 w-6 shrink-0 text-brand-primary" aria-hidden />
              <div>
                <p className="font-heading text-lg font-bold text-brand-dark">{coupon.code}</p>
                <p className="text-sm text-gray-700">
                  {coupon.type === "PERCENTAGE" ? `${Number(coupon.value)}% off` : `${formatBDT(coupon.value)} off`}
                  {Number(coupon.minOrderAmount) > 0 && ` on orders over ${formatBDT(coupon.minOrderAmount)}`}
                </p>
                <p className="mt-1 text-xs text-gray-500">Valid until {coupon.endsAt.toLocaleDateString("en-BD", { dateStyle: "medium" })}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
