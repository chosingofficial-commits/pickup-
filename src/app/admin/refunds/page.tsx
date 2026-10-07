import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { updateRefundStatusAction } from "@/lib/actions/refunds";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Refunds" };

export default async function AdminRefundsPage() {
  const refunds = await db.refund.findMany({
    include: { payment: { include: { orderGroup: { include: { customer: { select: { name: true } } } } } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Refunds</h1>
      <div className="space-y-2">
        {refunds.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border-brand bg-white p-4">
            <div>
              <p className="text-sm font-semibold text-brand-dark">
                {formatBDT(r.amount)} · {r.payment.orderGroup.customer.name}
              </p>
              <p className="text-xs text-gray-500">
                {r.reason} · {r.payment.provider}
                {r.payment.isSandbox && " (sandbox)"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={r.status === "PROCESSED" ? "brand" : r.status === "REJECTED" ? "danger" : "accent"}>{r.status}</Badge>
              {r.status === "REQUESTED" && (
                <>
                  <form action={updateRefundStatusAction}>
                    <input type="hidden" name="refundId" value={r.id} />
                    <input type="hidden" name="status" value="APPROVED" />
                    <button type="submit" className="rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
                      Approve
                    </button>
                  </form>
                  <form action={updateRefundStatusAction}>
                    <input type="hidden" name="refundId" value={r.id} />
                    <input type="hidden" name="status" value="REJECTED" />
                    <button type="submit" className="rounded-control border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                      Reject
                    </button>
                  </form>
                </>
              )}
              {r.status === "APPROVED" && (
                <form action={updateRefundStatusAction}>
                  <input type="hidden" name="refundId" value={r.id} />
                  <input type="hidden" name="status" value="PROCESSED" />
                  <button type="submit" className="rounded-control bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary-hover">
                    Mark processed
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
