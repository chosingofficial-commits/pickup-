import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PeriodFilter } from "@/components/admin/period-filter";
import { getOnlinePaymentsList, getOnlinePaymentsSummary } from "@/lib/admin/money";
import { PERIOD_KEYS, type PeriodKey } from "@/lib/date/period";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Payments" };

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period: periodRaw } = await searchParams;
  const period: PeriodKey = (PERIOD_KEYS as string[]).includes(periodRaw ?? "") ? (periodRaw as PeriodKey) : "today";

  const [payments, summary] = await Promise.all([getOnlinePaymentsList(period), getOnlinePaymentsSummary(period)]);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Payments</h1>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading text-lg font-bold text-brand-dark">Online payments received</h2>
            <PeriodFilter basePath="/admin/payments" period={period} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-control bg-surface-muted p-3">
              <p className="text-xs font-semibold text-brand-dark">Real payments</p>
              <p className="font-heading text-xl font-bold text-brand-dark">{formatBDT(summary.realTk)}</p>
              <p className="mt-0.5 text-[11px] text-gray-500">{summary.realCount} payment(s) — actual money received</p>
            </div>
            <div className="rounded-control bg-surface-muted p-3">
              <p className="text-xs font-semibold text-brand-dark">Sandbox payments (excluded above)</p>
              <p className="font-heading text-xl font-bold text-gray-400">{formatBDT(summary.sandboxTk)}</p>
              <p className="mt-0.5 text-[11px] text-gray-500">{summary.sandboxCount} payment(s) — test/simulated, no real money moved</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {payments.length === 0 ? (
        <p className="text-sm text-gray-500">No online payments in this period.</p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border-brand bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-border-brand bg-surface-muted text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Transaction ID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border-brand last:border-0 hover:bg-brand-bg">
                  <td className="px-4 py-3">
                    {p.orderGroup.orders.map((o) => (
                      <Link key={o.orderNumber} href={`/admin/orders`} className="block font-medium text-brand-dark hover:text-brand-primary">
                        {o.orderNumber}
                      </Link>
                    ))}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.orderGroup.customer.name}</td>
                  <td className="px-4 py-3 font-semibold text-brand-dark">{formatBDT(p.amount)}</td>
                  <td className="px-4 py-3 text-gray-600">{p.provider}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.providerRef ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={p.status === "PAID" ? "brand" : p.status === "FAILED" || p.status === "CANCELLED" ? "danger" : "accent"}>{p.status}</Badge>
                      {p.isSandbox && <Badge variant="warning">Sandbox</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{p.createdAt.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
