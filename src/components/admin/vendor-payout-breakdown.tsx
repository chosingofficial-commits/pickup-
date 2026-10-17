import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { formatBDT } from "@/lib/utils";
import type { VendorMoneyBreakdown, PayoutEligibility } from "@/lib/admin/vendor-payouts";
import { PayoutEligibilityBadge } from "./payout-eligibility-badge";

type Row = { label: string; value: string; note: string; emphasize?: boolean; negative?: boolean };

/**
 * The one shared money breakdown — used on a payout's own detail page (with
 * `thisRequest` set, showing the eligibility line for that specific amount)
 * and on the admin vendor detail page's "Payouts & balance" section (without
 * `thisRequest`, just the vendor's running totals). Every number here comes
 * from getVendorPayoutBalance()/getVendorMoneyBreakdown() — never a
 * separately-computed formula — so this can never disagree with the
 * vendor's own payouts page.
 */
export function VendorPayoutBreakdown({
  breakdown,
  thisRequest,
}: {
  breakdown: VendorMoneyBreakdown;
  thisRequest?: { amountTk: number; eligibility: PayoutEligibility };
}) {
  const rows: Row[] = [
    { label: "Item sales (delivered orders)", value: formatBDT(breakdown.itemSalesTk), note: "Subtotal of every order this vendor has fulfilled." },
    { label: "− Platform commission (snapshotted rates)", value: formatBDT(breakdown.commissionTk), note: "Each order's commission, at the rate that applied when it was placed — not today's rate.", negative: true },
    { label: "= Total earnings", value: formatBDT(breakdown.earningsTk), note: "What this vendor has earned, all time.", emphasize: true },
    { label: "− Already paid out", value: formatBDT(breakdown.paidTk), note: "Payouts marked PAID so far.", negative: true },
  ];

  if (thisRequest) {
    rows.push({
      label: "− Reserved by OTHER pending/approved requests",
      value: formatBDT(thisRequest.eligibility.reservedByOthers),
      note: "Every other request not yet paid — this request's own amount is excluded here so it isn't subtracted from itself.",
      negative: true,
    });
    rows.push({
      label: "= Available for THIS request",
      value: formatBDT(thisRequest.eligibility.availableForThisRequest),
      note: "Earnings minus paid minus everyone else's reserved amount.",
      emphasize: true,
    });
    rows.push({ label: "This request", value: formatBDT(thisRequest.amountTk), note: "The amount being decided on this page." });
  } else {
    rows.push({
      label: "− Reserved by pending/approved requests",
      value: formatBDT(breakdown.reservedTk),
      note: "Every request not yet paid, across this vendor's whole history.",
      negative: true,
    });
    rows.push({ label: "= Available to withdraw", value: formatBDT(breakdown.availableTk), note: "What's left to request or approve right now.", emphasize: true });
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <CardTitle>Money breakdown</CardTitle>
        <dl className="space-y-3 text-sm">
          {rows.map((row) => (
            <div key={row.label} className={row.emphasize ? "border-t border-border-brand pt-3" : undefined}>
              <div className="flex items-baseline justify-between gap-3">
                <dt className={row.emphasize ? "font-semibold text-brand-dark" : "text-gray-700"}>{row.label}</dt>
                <dd className={row.emphasize ? "font-heading text-base font-bold text-brand-dark" : "font-medium text-brand-dark"}>{row.value}</dd>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">{row.note}</p>
            </div>
          ))}
        </dl>

        {thisRequest && (
          <div className="flex items-center justify-between gap-3 rounded-control bg-surface-muted px-3.5 py-2.5">
            <span className="text-sm font-semibold text-brand-dark">Result</span>
            <PayoutEligibilityBadge eligibility={thisRequest.eligibility} />
          </div>
        )}

        <div className="rounded-control bg-surface-muted px-3.5 py-2.5 text-xs text-gray-600">
          <p className="font-semibold text-brand-dark">How we count</p>
          <p className="mt-1">
            This request&apos;s own amount is already included in &quot;reserved&quot; the moment it&apos;s requested or approved — so eligibility is checked as{" "}
            <span className="font-mono">earnings − paid − (reserved by OTHER requests) ≥ this amount</span>, never by subtracting this request from itself. Only
            DELIVERED orders count as earnings; in-progress, cancelled, failed, and refunded orders don&apos;t, until (or unless) they&apos;re delivered.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-border-brand pt-3 text-xs text-gray-600 sm:grid-cols-4">
          <div>
            <dt className="text-gray-500">Orders in progress</dt>
            <dd className="font-semibold text-brand-dark">
              {breakdown.inProgress.count} · {formatBDT(breakdown.inProgress.itemSalesTk)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Cancelled / failed / refunded</dt>
            <dd className="font-semibold text-brand-dark">
              {breakdown.excluded.count} · {formatBDT(breakdown.excluded.amountTk)}
            </dd>
          </div>
        </div>
        <p className="text-xs text-gray-500">Not counted in earnings above — shown for information only (in-progress orders haven&apos;t earned anything yet; excluded orders never will).</p>
      </CardContent>
    </Card>
  );
}
