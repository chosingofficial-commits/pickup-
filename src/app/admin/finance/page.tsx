import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBDT } from "@/lib/utils";
import { resolveFinanceRange, enumerateBuckets, type FinanceFilterParams } from "@/lib/admin/finance-period";
import {
  getFinanceOrdersBreakdown,
  getFinanceRefundsSummary,
  getFinanceRefundsList,
  getVendorCommissionTotals,
  getVendorCommissionRows,
  getOrderCommissionRows,
  getRiderCommissionTotals,
  getRiderCommissionRows,
  getFinanceMoneySummary,
  getFinanceSeries,
  getFinanceCheckTable,
  type OrderTypeBreakdown,
} from "@/lib/admin/finance";
import { FinanceDateFilter } from "@/components/admin/finance/finance-date-filter";
import { FinancePagination } from "@/components/admin/finance/finance-pagination";

export const metadata: Metadata = { title: "Finance" };

const DHAKA_DATETIME = { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" } as const;
function formatDhaka(date: Date | null): string {
  return date ? new Intl.DateTimeFormat("en-BD", DHAKA_DATETIME).format(date) : "—";
}

type SearchParams = FinanceFilterParams & { refundPage?: string; vendorPage?: string; riderPage?: string; orderPage?: string };

function StatusRow({ label, stats, totalAmount }: { label: string; stats: { count: number; amountTk: number }; totalAmount: number }) {
  const pct = totalAmount > 0 ? Math.round((stats.amountTk / totalAmount) * 100) : 0;
  return (
    <tr className="border-b border-border-brand last:border-0">
      <td className="px-3 py-2 text-gray-600">{label}</td>
      <td className="px-3 py-2 text-right">{stats.count}</td>
      <td className="px-3 py-2 text-right font-semibold text-brand-dark">{formatBDT(stats.amountTk)}</td>
      <td className="px-3 py-2 text-right text-xs text-gray-400">{pct}%</td>
    </tr>
  );
}

function OrderTypeTable({ title, data }: { title: string; data: OrderTypeBreakdown }) {
  return (
    <div className="overflow-x-auto rounded-card border border-border-brand bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-border-brand bg-surface-muted text-left text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2" colSpan={2}>
              {title}
            </th>
            <th className="px-3 py-2 text-right">{data.count}</th>
            <th className="px-3 py-2 text-right">{formatBDT(data.amountTk)}</th>
          </tr>
        </thead>
        <tbody>
          <StatusRow label="Delivered" stats={data.byStatus.delivered} totalAmount={data.amountTk} />
          <StatusRow label="In progress" stats={data.byStatus.inProgress} totalAmount={data.amountTk} />
          <StatusRow label="Cancelled" stats={data.byStatus.cancelled} totalAmount={data.amountTk} />
          <StatusRow label="Refunded" stats={data.byStatus.refunded} totalAmount={data.amountTk} />
        </tbody>
      </table>
    </div>
  );
}

function SummaryLine({ label, value, explanation }: { label: string; value: string; explanation: string }) {
  return (
    <div className="border-b border-border-brand py-2.5 last:border-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-brand-dark">{label}</p>
        <p className="font-heading text-base font-bold text-brand-dark">{value}</p>
      </div>
      <p className="mt-0.5 text-xs text-gray-500">{explanation}</p>
    </div>
  );
}

export default async function AdminFinancePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const range = resolveFinanceRange(params);
  const refundPage = Math.max(1, Number(params.refundPage) || 1);
  const vendorPage = Math.max(1, Number(params.vendorPage) || 1);
  const riderPage = Math.max(1, Number(params.riderPage) || 1);
  const orderPage = Math.max(1, Number(params.orderPage) || 1);

  const [ordersBreakdown, refundsSummary, refundsList, vendorTotals, vendorRows, orderRows, riderTotals, riderRows, moneySummary, checkTable] = await Promise.all([
    getFinanceOrdersBreakdown(range),
    getFinanceRefundsSummary(range),
    getFinanceRefundsList(range, refundPage),
    getVendorCommissionTotals(range),
    getVendorCommissionRows(range, vendorPage),
    getOrderCommissionRows(range, orderPage),
    getRiderCommissionTotals(range),
    getRiderCommissionRows(range, riderPage),
    getFinanceMoneySummary(range),
    getFinanceCheckTable(),
  ]);

  // Series only computed for a bounded range — "All time" grouped by day
  // could mean thousands of buckets; enumerateBuckets caps at 400, but for
  // "all time" we skip it entirely rather than show a misleadingly-truncated
  // series starting from an arbitrary epoch.
  const seriesBuckets = range.start && range.end ? enumerateBuckets(range.start, range.end, range.groupBy) : [];
  const series = seriesBuckets.length > 0 ? await getFinanceSeries(seriesBuckets) : [];

  // Carries the date filter (and nothing page-specific) into each section's
  // own pagination links.
  const baseParams = new URLSearchParams();
  baseParams.set("quick", range.quick);
  baseParams.set("groupBy", range.groupBy);
  if (params.from) baseParams.set("from", params.from);
  if (params.to) baseParams.set("to", params.to);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Finance</h1>

      <FinanceDateFilter quick={range.quick} groupBy={range.groupBy} from={range.start} to={range.end} />

      <Card>
        <CardContent className="space-y-2 pt-5 text-sm text-gray-600">
          <CardTitle className="mb-2">How we count</CardTitle>
          <p>
            <strong className="text-brand-dark">Orders</strong> are counted by when they were <strong>placed</strong>. <strong className="text-brand-dark">Money</strong> (item sales,
            delivery fees, commission) only counts orders that reached <strong>Delivered</strong> — a cancelled or still-in-progress order isn&apos;t revenue yet, even if it was
            placed in this window.
          </p>
          <p>
            <strong className="text-brand-dark">Refunds</strong> only count ones actually <strong>processed</strong> (money really sent back) — a request that&apos;s still pending
            or was rejected doesn&apos;t count, and refunds are dated by when they were processed, not when they were requested.
          </p>
          <p>
            <strong className="text-brand-dark">Commission</strong> always uses the rate that was saved on the order at the time — never today&apos;s rate — so a later change to a
            vendor&apos;s or rider&apos;s rate never rewrites history.
          </p>
          <p>
            <strong className="text-brand-dark">&quot;Owed to vendors&quot;, &quot;Owed to riders&quot;, and &quot;COD cash still held&quot;</strong> are running balances — always
            shown as of right now, not limited to the date filter above, the same way a bank balance isn&apos;t a &quot;this month&quot; number.
          </p>
          <p>Every refund today is a full refund of the whole order (there&apos;s no partial/line-item refund yet) — &quot;products refunded&quot; shows that order&apos;s own items.</p>
          <p>Advertising income is tracked separately (see the main dashboard / Advertising) and isn&apos;t part of this page&apos;s numbers.</p>
        </CardContent>
      </Card>

      {/* 2) Orders */}
      <Card>
        <CardContent className="space-y-4 pt-5">
          <CardTitle>Orders — {range.label}</CardTitle>
          <div className="grid gap-4 lg:grid-cols-2">
            <OrderTypeTable title="Restaurant orders" data={ordersBreakdown.restaurant} />
            <OrderTypeTable title="Shop orders" data={ordersBreakdown.shop} />
          </div>
          <p className="text-xs text-gray-500">
            Total: {ordersBreakdown.total.count} order{ordersBreakdown.total.count === 1 ? "" : "s"} · {formatBDT(ordersBreakdown.total.amountTk)}
          </p>
        </CardContent>
      </Card>

      {/* 1) Group-by series */}
      {series.length > 0 && (
        <Card>
          <CardContent className="pt-5">
            <CardTitle className="mb-4">
              Delivered orders by {range.groupBy} — {range.label}
            </CardTitle>
            <div className="overflow-x-auto rounded-card border border-border-brand bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-border-brand bg-surface-muted text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">{range.groupBy === "day" ? "Day" : range.groupBy === "week" ? "Week" : "Month"}</th>
                    <th className="px-3 py-2 text-right">Delivered orders</th>
                    <th className="px-3 py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {series.map((row) => (
                    <tr key={row.key} className="border-b border-border-brand last:border-0">
                      <td className="px-3 py-2 text-gray-600">{row.label}</td>
                      <td className="px-3 py-2 text-right">{row.orderCount}</td>
                      <td className="px-3 py-2 text-right font-semibold text-brand-dark">{formatBDT(row.revenueTk)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5) Money summary */}
      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-1">Money summary — {range.label}</CardTitle>
          <div>
            <SummaryLine label="Customers paid (total)" value={formatBDT(moneySummary.customersPaidTk)} explanation="Everything customers paid for delivered orders — items + delivery fees, minus discounts." />
            <SummaryLine label="Item sales (subtotal)" value={formatBDT(moneySummary.itemSalesTk)} explanation="Just the products/food, before delivery fees or discounts." />
            <SummaryLine label="Delivery fees charged to customers" value={formatBDT(moneySummary.deliveryFeesChargedTk)} explanation="What customers actually paid for delivery (zero on a free-delivery order)." />
            <SummaryLine
              label="Free-delivery offer cost"
              value={formatBDT(moneySummary.freeDeliveryCostTk)}
              explanation="Riders are still paid their normal share even when the customer pays Tk 0 for delivery — Pick Up covers that out of pocket."
            />
            <SummaryLine label="Discounts / coupons" value={formatBDT(moneySummary.discountsTk)} explanation="Coupon discounts applied to delivered orders." />
            <SummaryLine label="Refunds" value={formatBDT(moneySummary.refundsTk)} explanation="Refunds actually processed in this period (not just requested)." />
            <SummaryLine label="Vendor commission earned" value={formatBDT(moneySummary.vendorCommissionTk)} explanation="Pick Up's cut of item sales, at each order's own saved rate." />
            <SummaryLine label="Rider commission earned" value={formatBDT(moneySummary.riderCommissionTk)} explanation="Pick Up's cut of the delivery fee, at each delivery's own saved rate." />
            <SummaryLine label="Paid to vendors" value={formatBDT(moneySummary.paidToVendorsTk)} explanation="Payouts actually sent to vendors in this period." />
            <SummaryLine label="Owed to vendors" value={formatBDT(moneySummary.owedToVendorsAllTimeTk)} explanation="Running balance, all time — not limited to this period." />
            <SummaryLine label="Paid to riders" value={formatBDT(moneySummary.paidToRidersTk)} explanation="Payouts actually sent to riders in this period." />
            <SummaryLine label="Owed to riders" value={formatBDT(moneySummary.owedToRidersAllTimeTk)} explanation="Running balance, all time — not limited to this period." />
            <div className="mt-2 rounded-control border-2 border-dashed border-border-brand p-3">
              <SummaryLine
                label="Pick Up's net earnings"
                value={formatBDT(moneySummary.netEarningsTk)}
                explanation="(Vendor commission + rider commission) − free-delivery cost − refunds processed this period."
              />
            </div>
            <SummaryLine label="COD cash still held by riders" value={formatBDT(moneySummary.codStillHeldAllTimeTk)} explanation="Cash riders have collected but not yet handed over — running balance, all time." />
          </div>
        </CardContent>
      </Card>

      {/* 3) Refunds */}
      <Card>
        <CardContent className="space-y-4 pt-5">
          <CardTitle>Refunds — {range.label}</CardTitle>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-control bg-surface-muted p-3">
              <p className="text-xs font-semibold text-brand-dark">Refunded orders</p>
              <p className="font-heading text-lg font-bold text-brand-dark">{refundsSummary.ordersCount}</p>
            </div>
            <div className="rounded-control bg-surface-muted p-3">
              <p className="text-xs font-semibold text-brand-dark">Refunded items</p>
              <p className="font-heading text-lg font-bold text-brand-dark">{refundsSummary.itemsCount}</p>
            </div>
            <div className="rounded-control bg-surface-muted p-3">
              <p className="text-xs font-semibold text-brand-dark">Total refunded</p>
              <p className="font-heading text-lg font-bold text-brand-dark">{formatBDT(refundsSummary.totalTk)}</p>
            </div>
            <div className="rounded-control bg-surface-muted p-3">
              <p className="text-xs font-semibold text-brand-dark">Restaurant vs Shop</p>
              <p className="text-sm text-gray-600">
                {formatBDT(refundsSummary.restaurant.totalTk)} ({refundsSummary.restaurant.ordersCount}) / {formatBDT(refundsSummary.shop.totalTk)} ({refundsSummary.shop.ordersCount})
              </p>
            </div>
          </div>

          {refundsList.rows.length === 0 ? (
            <p className="text-sm text-gray-500">No processed refunds in this period.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-card border border-border-brand bg-white">
                <table className="w-full text-sm">
                  <thead className="border-b border-border-brand bg-surface-muted text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Date &amp; time</th>
                      <th className="px-3 py-2">Order</th>
                      <th className="px-3 py-2">Customer</th>
                      <th className="px-3 py-2">Vendor</th>
                      <th className="px-3 py-2">Products</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2">Reason</th>
                      <th className="px-3 py-2">Full/partial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refundsList.rows.map((r) => (
                      <tr key={r.id} className="border-b border-border-brand last:border-0">
                        <td className="px-3 py-2 text-xs text-gray-500">{formatDhaka(r.processedAt)}</td>
                        <td className="px-3 py-2">
                          {r.orderNumber ? (
                            <span className="font-medium text-brand-dark">{r.orderNumber}</span>
                          ) : (
                            <span className="text-gray-400">(no linked order)</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{r.customerName}</td>
                        <td className="px-3 py-2 text-gray-600">{r.vendorName ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{r.items.map((i) => `${i.name} ×${i.quantity}`).join(", ") || "—"}</td>
                        <td className="px-3 py-2 text-right">{r.totalQuantity}</td>
                        <td className="px-3 py-2 text-right font-semibold text-brand-dark">{formatBDT(r.amountTk)}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{r.reason}</td>
                        <td className="px-3 py-2">
                          <Badge variant={r.isFull ? "accent" : "warning"}>{r.isFull ? "Full" : "Partial"}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <FinancePagination page={refundPage} totalPages={refundsList.totalPages} totalCount={refundsList.totalCount} itemLabel="refund" pageParam="refundPage" currentParams={baseParams} />
            </>
          )}
        </CardContent>
      </Card>

      {/* 4) Commission */}
      <Card>
        <CardContent className="space-y-4 pt-5">
          <CardTitle>Vendor commission — {range.label}</CardTitle>
          <p className="text-sm text-gray-600">
            Total: <strong className="text-brand-dark">{formatBDT(vendorTotals.vendorCommissionTk)}</strong> from {vendorTotals.orderCount} delivered order
            {vendorTotals.orderCount === 1 ? "" : "s"} ({formatBDT(vendorTotals.itemSalesTk)} in item sales).
          </p>
          <div className="overflow-x-auto rounded-card border border-border-brand bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-border-brand bg-surface-muted text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Vendor</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2 text-right">Rate (period)</th>
                  <th className="px-3 py-2 text-right">Orders</th>
                  <th className="px-3 py-2 text-right">Item sales</th>
                  <th className="px-3 py-2 text-right">Commission</th>
                </tr>
              </thead>
              <tbody>
                {vendorRows.rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-sm text-gray-500">
                      No delivered orders in this period.
                    </td>
                  </tr>
                ) : (
                  vendorRows.rows.map((v) => (
                    <tr key={v.vendorId} className="border-b border-border-brand last:border-0">
                      <td className="px-3 py-2 font-medium text-brand-dark">{v.vendorName}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{v.businessType === "RESTAURANT" ? "Restaurant" : "Shop"}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{v.effectiveRatePct.toFixed(2)}%</td>
                      <td className="px-3 py-2 text-right">{v.orderCount}</td>
                      <td className="px-3 py-2 text-right">{formatBDT(v.itemSalesTk)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-brand-dark">{formatBDT(v.commissionTk)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <FinancePagination page={vendorPage} totalPages={vendorRows.totalPages} totalCount={vendorRows.totalCount} itemLabel="vendor" pageParam="vendorPage" currentParams={baseParams} />

          <CardTitle>Vendor commission — per order</CardTitle>
          <div className="overflow-x-auto rounded-card border border-border-brand bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-border-brand bg-surface-muted text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Vendor</th>
                  <th className="px-3 py-2">Delivered</th>
                  <th className="px-3 py-2 text-right">Item sales</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Commission</th>
                </tr>
              </thead>
              <tbody>
                {orderRows.rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-sm text-gray-500">
                      No delivered orders in this period.
                    </td>
                  </tr>
                ) : (
                  orderRows.rows.map((o) => (
                    <tr key={o.orderId} className="border-b border-border-brand last:border-0">
                      <td className="px-3 py-2">
                        <Link href={`/admin/orders/${o.orderId}`} className="font-medium text-brand-dark hover:text-brand-primary">
                          {o.orderNumber}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{o.vendorName}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{formatDhaka(o.updatedAt)}</td>
                      <td className="px-3 py-2 text-right">{formatBDT(o.itemSalesTk)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{o.ratePct.toFixed(2)}%</td>
                      <td className="px-3 py-2 text-right font-semibold text-brand-dark">{formatBDT(o.commissionTk)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <FinancePagination page={orderPage} totalPages={orderRows.totalPages} totalCount={orderRows.totalCount} itemLabel="order" pageParam="orderPage" currentParams={baseParams} />

          <CardTitle>Rider commission — {range.label}</CardTitle>
          <p className="text-sm text-gray-600">
            Total: <strong className="text-brand-dark">{formatBDT(riderTotals.riderCommissionTk)}</strong> from {riderTotals.deliveryCount} delivery
            {riderTotals.deliveryCount === 1 ? "" : "ies"}.
          </p>
          <div className="overflow-x-auto rounded-card border border-border-brand bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-border-brand bg-surface-muted text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Rider</th>
                  <th className="px-3 py-2 text-right">Rate (period)</th>
                  <th className="px-3 py-2 text-right">Deliveries</th>
                  <th className="px-3 py-2 text-right">Delivery fees</th>
                  <th className="px-3 py-2 text-right">Commission</th>
                </tr>
              </thead>
              <tbody>
                {riderRows.rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-sm text-gray-500">
                      No delivered orders in this period.
                    </td>
                  </tr>
                ) : (
                  riderRows.rows.map((r) => (
                    <tr key={r.riderId} className="border-b border-border-brand last:border-0">
                      <td className="px-3 py-2 font-medium text-brand-dark">{r.riderName}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{r.effectiveRatePct.toFixed(2)}%</td>
                      <td className="px-3 py-2 text-right">{r.deliveryCount}</td>
                      <td className="px-3 py-2 text-right">{formatBDT(r.deliveryFeeTotalTk)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-brand-dark">{formatBDT(r.riderCommissionTk)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <FinancePagination page={riderPage} totalPages={riderRows.totalPages} totalCount={riderRows.totalCount} itemLabel="rider" pageParam="riderPage" currentParams={baseParams} />
        </CardContent>
      </Card>

      {/* 6) Check table */}
      <Card>
        <CardContent className="space-y-3 pt-5">
          <CardTitle>Check table — this month, old vs new</CardTitle>
          <p className="text-sm text-gray-600">Confirms this page&apos;s numbers match the existing Money overview (on the main Admin dashboard) for the same period.</p>
          <div className="overflow-x-auto rounded-card border border-border-brand bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-border-brand bg-surface-muted text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Figure</th>
                  <th className="px-3 py-2 text-right">Old (Money overview)</th>
                  <th className="px-3 py-2 text-right">New (this page)</th>
                  <th className="px-3 py-2">Match?</th>
                </tr>
              </thead>
              <tbody>
                {checkTable.map((row) => (
                  <tr key={row.label} className="border-b border-border-brand align-top last:border-0">
                    <td className="px-3 py-2 text-gray-600">{row.label}</td>
                    <td className="px-3 py-2 text-right">{formatBDT(Number(row.oldValue))}</td>
                    <td className="px-3 py-2 text-right">{formatBDT(Number(row.newValue))}</td>
                    <td className="px-3 py-2">
                      <Badge variant={row.matches ? "brand" : "warning"}>{row.matches ? "Matches" : "Differs — expected"}</Badge>
                      {row.note && <p className="mt-1 max-w-xs text-xs text-gray-500">{row.note}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
