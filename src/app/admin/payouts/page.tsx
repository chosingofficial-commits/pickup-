import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PayoutEligibilityBadge } from "@/components/admin/payout-eligibility-badge";
import { getPayoutsSummary, getPayoutsList } from "@/lib/admin/vendor-payouts";
import { formatBDT } from "@/lib/utils";
import type { PayoutStatus } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Vendor payouts" };

const STATUSES: PayoutStatus[] = ["PENDING", "APPROVED", "PAID", "REJECTED"];

type SearchParams = { status?: string; vendor?: string; from?: string; to?: string; page?: string };

function SummaryCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-heading text-lg font-bold text-brand-dark">{value}</p>
        {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default async function AdminPayoutsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { status, vendor, from, to, page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);

  const [summary, list] = await Promise.all([
    getPayoutsSummary(),
    getPayoutsList({ status, vendorQuery: vendor, from, to, page }),
  ]);

  const query = (overrides: Partial<SearchParams>) => {
    const params = new URLSearchParams();
    const merged = { status, vendor, from, to, ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, String(value));
    }
    return `/admin/payouts?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Vendor payouts</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="Pending requests" value={formatBDT(summary.pendingTk)} hint={`${summary.pendingCount} request${summary.pendingCount === 1 ? "" : "s"}`} />
        <SummaryCard
          label="Approved, not yet paid"
          value={formatBDT(summary.approvedTk)}
          hint={`${summary.approvedCount} request${summary.approvedCount === 1 ? "" : "s"}`}
        />
        <SummaryCard label="Paid this month" value={formatBDT(summary.paidThisMonthTk)} />
        <SummaryCard label="Rejected this month" value={String(summary.rejectedThisMonthCount)} hint="requests" />
      </div>

      <form method="GET" className="flex flex-wrap items-end gap-3 rounded-card border border-border-brand bg-white p-4">
        <div>
          <label htmlFor="vendor" className="mb-1 block text-xs font-semibold text-brand-dark">
            Vendor
          </label>
          <input
            id="vendor"
            name="vendor"
            type="search"
            defaultValue={vendor ?? ""}
            placeholder="Search by vendor name"
            className="h-9 w-56 rounded-control border border-border-brand px-2.5 text-xs"
          />
        </div>
        <div>
          <label htmlFor="status" className="mb-1 block text-xs font-semibold text-brand-dark">
            Status
          </label>
          <select id="status" name="status" defaultValue={status ?? "ALL"} className="h-9 rounded-control border border-border-brand px-2.5 text-xs">
            <option value="ALL">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="from" className="mb-1 block text-xs font-semibold text-brand-dark">
            From
          </label>
          <input id="from" name="from" type="date" defaultValue={from ?? ""} className="h-9 rounded-control border border-border-brand px-2.5 text-xs" />
        </div>
        <div>
          <label htmlFor="to" className="mb-1 block text-xs font-semibold text-brand-dark">
            To
          </label>
          <input id="to" name="to" type="date" defaultValue={to ?? ""} className="h-9 rounded-control border border-border-brand px-2.5 text-xs" />
        </div>
        <button type="submit" className="h-9 rounded-control bg-brand-primary px-4 text-xs font-semibold text-white hover:bg-brand-primary-hover">
          Filter
        </button>
        {(status || vendor || from || to) && (
          <Link href="/admin/payouts" className="h-9 rounded-control border border-border-brand px-4 text-xs font-semibold leading-9 text-brand-dark hover:bg-brand-bg">
            Clear
          </Link>
        )}
      </form>

      {list.rows.length === 0 ? (
        <p className="text-sm text-gray-500">No payout requests match these filters.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-card border border-border-brand bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-border-brand bg-surface-muted text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Requested</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Vendor&apos;s available balance</th>
                  <th className="px-4 py-3">Payout destination</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Eligibility</th>
                </tr>
              </thead>
              <tbody>
                {list.rows.map((row) => (
                  <tr key={row.id} className="border-b border-border-brand last:border-0 hover:bg-brand-bg">
                    <td className="px-4 py-3">
                      <Link href={`/admin/payouts/${row.id}`} className="font-medium text-brand-dark hover:text-brand-primary">
                        {row.requestedAt.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {row.vendorName} <span className="text-xs text-gray-500">({row.businessType === "RESTAURANT" ? "Restaurant" : "Shop"})</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-brand-dark">{formatBDT(row.requestedAmountTk)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatBDT(row.vendorAvailableTk)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{row.payoutDestination ?? "Not on file"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={row.status === "PAID" ? "brand" : row.status === "REJECTED" ? "danger" : "accent"}>{row.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <PayoutEligibilityBadge eligibility={row.eligibility} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-gray-500">
              {list.totalCount} request{list.totalCount === 1 ? "" : "s"} · page {list.page} of {list.totalPages}
            </p>
            <div className="flex gap-2">
              <Link
                href={query({ page: String(Math.max(1, list.page - 1)) })}
                aria-disabled={list.page <= 1}
                className={`rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold ${list.page <= 1 ? "pointer-events-none text-gray-300" : "text-brand-dark hover:bg-brand-bg"}`}
              >
                Previous
              </Link>
              <Link
                href={query({ page: String(Math.min(list.totalPages, list.page + 1)) })}
                aria-disabled={list.page >= list.totalPages}
                className={`rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold ${list.page >= list.totalPages ? "pointer-events-none text-gray-300" : "text-brand-dark hover:bg-brand-bg"}`}
              >
                Next
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
