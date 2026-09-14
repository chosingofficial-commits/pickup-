import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { CoverageRequestStatusSelect } from "@/components/admin/coverage-request-status-select";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Coverage requests" };

export default async function AdminCoverageRequestsPage() {
  const requests = await db.coverageRequest.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Coverage requests</h1>
      <p className="text-sm text-gray-600">Customers outside our active zones who want Pick Up in their area.</p>

      {requests.length === 0 ? (
        <p className="text-sm text-gray-500">No requests yet.</p>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border-brand bg-white p-4">
              <div>
                <p className="text-sm font-semibold text-brand-dark">{r.name} · {r.phone}</p>
                <p className="text-xs text-gray-500">{r.addressText}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={r.status === "ACTIVATED" ? "brand" : r.status === "DECLINED" ? "danger" : "accent"}>{r.status}</Badge>
                <CoverageRequestStatusSelect requestId={r.id} status={r.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
