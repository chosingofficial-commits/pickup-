import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { updatePayoutStatusAction } from "@/lib/actions/admin-payouts";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Vendor payouts" };

export default async function AdminPayoutsPage() {
  const payouts = await db.vendorPayout.findMany({
    include: { vendor: { select: { businessName: true } } },
    orderBy: { requestedAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Vendor payouts</h1>
      <div className="space-y-2">
        {payouts.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border-brand bg-white p-4">
            <div>
              <p className="text-sm font-semibold text-brand-dark">{p.vendor.businessName}</p>
              <p className="text-xs text-gray-500">
                {formatBDT(p.amount)} · Requested {p.requestedAt.toLocaleDateString("en-BD", { dateStyle: "medium" })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={p.status === "PAID" ? "brand" : p.status === "REJECTED" ? "danger" : "accent"}>{p.status}</Badge>
              {p.status === "PENDING" && (
                <>
                  <form action={updatePayoutStatusAction}>
                    <input type="hidden" name="payoutId" value={p.id} />
                    <input type="hidden" name="status" value="APPROVED" />
                    <button type="submit" className="rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
                      Approve
                    </button>
                  </form>
                  <form action={updatePayoutStatusAction}>
                    <input type="hidden" name="payoutId" value={p.id} />
                    <input type="hidden" name="status" value="REJECTED" />
                    <button type="submit" className="rounded-control border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                      Reject
                    </button>
                  </form>
                </>
              )}
              {p.status === "APPROVED" && (
                <form action={updatePayoutStatusAction}>
                  <input type="hidden" name="payoutId" value={p.id} />
                  <input type="hidden" name="status" value="PAID" />
                  <button type="submit" className="rounded-control bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary-hover">
                    Mark paid
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
