import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VendorPayoutBreakdown } from "@/components/admin/vendor-payout-breakdown";
import { PayoutActions } from "@/components/admin/payout-actions";
import {
  getVendorInfoForPayout,
  getVendorMoneyBreakdown,
  getVendorDeliveredOrders,
  getVendorPayoutHistory,
  computeEligibility,
} from "@/lib/admin/vendor-payouts";
import { getVendorPayoutBalance } from "@/lib/vendor/payout-balance";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Payout request" };

export default async function AdminPayoutDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ payoutId: string }>;
  searchParams: Promise<{ ordersPage?: string }>;
}) {
  const { payoutId } = await params;
  const { ordersPage: ordersPageRaw } = await searchParams;
  const ordersPage = Math.max(1, Number(ordersPageRaw) || 1);

  const payout = await db.vendorPayout.findUnique({ where: { id: payoutId } });
  if (!payout) notFound();

  const [vendor, breakdown, deliveredOrders, history, balance] = await Promise.all([
    getVendorInfoForPayout(payout.vendorId),
    getVendorMoneyBreakdown(payout.vendorId),
    getVendorDeliveredOrders(payout.vendorId, ordersPage),
    getVendorPayoutHistory(payout.vendorId),
    getVendorPayoutBalance(payout.vendorId),
  ]);
  if (!vendor) notFound();

  const requestedAmountTk = Number(payout.amount);
  const eligibility =
    payout.status === "PENDING" || payout.status === "APPROVED" ? computeEligibility(requestedAmountTk, balance) : null;

  const payoutDestination = vendor.application?.bankOrMfsAccount ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/payouts" className="text-xs font-semibold text-brand-primary hover:underline">
          ← All payouts
        </Link>
        <h1 className="mt-1 font-heading text-2xl font-bold text-brand-dark">
          Payout request · {formatBDT(requestedAmountTk)}
        </h1>
        <p className="text-sm text-gray-500">
          Requested {payout.requestedAt.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })} ·{" "}
          <Badge variant={payout.status === "PAID" ? "brand" : payout.status === "REJECTED" ? "danger" : "accent"}>{payout.status}</Badge>
        </p>
      </div>

      {/* A) Vendor info */}
      <Card>
        <CardContent className="space-y-2 pt-5">
          <CardTitle>Vendor</CardTitle>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-gray-500">Business</dt>
              <dd className="font-semibold text-brand-dark">
                <Link href={`/admin/vendors/${vendor.id}`} className="hover:text-brand-primary hover:underline">
                  {vendor.businessName}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Type</dt>
              <dd className="text-gray-700">{vendor.businessType === "RESTAURANT" ? "Restaurant" : "Shop"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Owner</dt>
              <dd className="text-gray-700">{vendor.user.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Phone</dt>
              <dd className="text-gray-700">{vendor.user.phone}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Email</dt>
              <dd className="text-gray-700">{vendor.user.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Commission rate</dt>
              <dd className="text-gray-700">{Number(vendor.commissionRatePct)}%</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Account status</dt>
              <dd>
                <Badge variant={vendor.isSuspended ? "danger" : vendor.isApproved ? "success" : "accent"}>
                  {vendor.isSuspended ? "Suspended" : vendor.isApproved ? "Approved" : "Not approved"}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Joined</dt>
              <dd className="text-gray-700">{vendor.createdAt.toLocaleDateString("en-BD", { dateStyle: "medium" })}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* B + C) Money breakdown, with this request's eligibility */}
      <VendorPayoutBreakdown breakdown={breakdown} thisRequest={eligibility ? { amountTk: requestedAmountTk, eligibility } : undefined} />

      {/* H) Actions */}
      {eligibility && (
        <Card>
          <CardContent className="pt-5">
            <CardTitle className="mb-3">Actions</CardTitle>
            <PayoutActions
              payoutId={payout.id}
              status={payout.status}
              canBePaid={eligibility.canBePaid}
              ineligibleReason={eligibility.canBePaid ? undefined : `Not enough balance: short by ${formatBDT(eligibility.shortByTk)}.`}
              vendorName={vendor.businessName}
              amountTk={requestedAmountTk}
              payoutDestination={payoutDestination}
            />
          </CardContent>
        </Card>
      )}

      {/* G) Payout destination — admin-only */}
      <Card>
        <CardContent className="space-y-1 pt-5">
          <CardTitle>Payout destination</CardTitle>
          <p className="text-xs text-gray-500">On file from this vendor&apos;s registration — not editable here.</p>
          <p className="mt-2 text-sm font-medium text-brand-dark">{payoutDestination ?? "Not on file — contact the vendor before paying."}</p>
          <p className="text-xs text-amber-700">Taken from the vendor&apos;s registration. Confirm with the vendor before sending money.</p>
          {payout.referenceNo && (
            <p className="text-xs text-gray-500">
              Last payment reference: <span className="font-mono">{payout.referenceNo}</span>
            </p>
          )}
          {payout.status === "REJECTED" && payout.adminNote && (
            <p className="mt-2 text-xs text-red-600">Rejection reason: {payout.adminNote}</p>
          )}
        </CardContent>
      </Card>

      {/* E) Cash-flow check (COD) */}
      <Card>
        <CardContent className="space-y-1 pt-5">
          <CardTitle>Cash-flow check (COD)</CardTitle>
          <p className="text-sm text-gray-600">
            Not available per order with current data. Cash handovers from riders to Pick Up (<span className="font-mono">RiderLedgerEntry</span> rows of
            type <span className="font-mono">CASH_HANDOVER</span>) are recorded as one lump sum against the rider&apos;s own running balance — they aren&apos;t
            linked to specific deliveries, and a rider typically carries cash for many vendors&apos; orders at once. There is no reliable way to say
            &quot;this specific order&apos;s cash has/hasn&apos;t been handed over&quot; without guessing.
          </p>
          <p className="text-xs text-gray-500">
            To make this possible: either link each CASH_HANDOVER entry to the specific deliveries it covers, or record a running
            &quot;still with rider&quot; flag per delivery instead of only per rider.
          </p>
        </CardContent>
      </Card>

      {/* D) Delivered orders */}
      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-3">Orders behind the earnings ({deliveredOrders.totalCount} delivered)</CardTitle>
          {deliveredOrders.rows.length === 0 ? (
            <p className="text-sm text-gray-500">No delivered orders yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-card border border-border-brand">
                <table className="w-full text-sm">
                  <thead className="border-b border-border-brand bg-surface-muted text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Order</th>
                      <th className="px-3 py-2">Delivered</th>
                      <th className="px-3 py-2">Items subtotal</th>
                      <th className="px-3 py-2">Rate</th>
                      <th className="px-3 py-2">Commission</th>
                      <th className="px-3 py-2">Vendor earnings</th>
                      <th className="px-3 py-2">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveredOrders.rows.map((o) => (
                      <tr key={o.id} className="border-b border-border-brand last:border-0">
                        <td className="px-3 py-2">
                          <Link href={`/admin/orders/${o.id}`} className="font-medium text-brand-dark hover:text-brand-primary">
                            {o.orderNumber}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">{o.deliveredAt.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}</td>
                        <td className="px-3 py-2">{formatBDT(o.itemSalesTk)}</td>
                        <td className="px-3 py-2 text-gray-600">{o.ratePct}%</td>
                        <td className="px-3 py-2">{formatBDT(o.commissionTk)}</td>
                        <td className="px-3 py-2 font-semibold text-brand-dark">{formatBDT(o.vendorEarningsTk)}</td>
                        <td className="px-3 py-2 text-xs text-gray-600">{o.paymentMethod}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-gray-500">page {ordersPage} of {deliveredOrders.totalPages}</p>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/payouts/${payoutId}?ordersPage=${Math.max(1, ordersPage - 1)}`}
                    aria-disabled={ordersPage <= 1}
                    className={`rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold ${ordersPage <= 1 ? "pointer-events-none text-gray-300" : "text-brand-dark hover:bg-brand-bg"}`}
                  >
                    Previous
                  </Link>
                  <Link
                    href={`/admin/payouts/${payoutId}?ordersPage=${Math.min(deliveredOrders.totalPages, ordersPage + 1)}`}
                    aria-disabled={ordersPage >= deliveredOrders.totalPages}
                    className={`rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold ${ordersPage >= deliveredOrders.totalPages ? "pointer-events-none text-gray-300" : "text-brand-dark hover:bg-brand-bg"}`}
                  >
                    Next
                  </Link>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* F) Payout history for this vendor */}
      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-3">Payout history for {vendor.businessName}</CardTitle>
          <div className="space-y-3">
            {history.map((h) => (
              <div key={h.id} className={`rounded-control border p-3 text-sm ${h.id === payoutId ? "border-brand-primary bg-brand-bg" : "border-border-brand"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-brand-dark">{formatBDT(h.amountTk)}</span>
                  <Badge variant={h.status === "PAID" ? "brand" : h.status === "REJECTED" ? "danger" : "accent"}>{h.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Requested {h.requestedAt.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}
                  {h.processedAt && ` · Processed ${h.processedAt.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}`}
                </p>
                {h.events.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-gray-600">
                    {h.events.map((e, i) => (
                      <li key={i}>
                        {e.fromStatus} → {e.toStatus} by {e.actorName} ({e.actorRole}) — {e.at.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}
                      </li>
                    ))}
                  </ul>
                )}
                {h.referenceNo && (
                  <p className="mt-1 text-xs text-gray-500">
                    Reference: <span className="font-mono">{h.referenceNo}</span>
                  </p>
                )}
                {h.status === "REJECTED" && h.adminNote && <p className="mt-1 text-xs text-red-600">Reason: {h.adminNote}</p>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
