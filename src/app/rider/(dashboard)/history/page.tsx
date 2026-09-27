import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wallet, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth/session";
import { getRiderHistory, getRiderDeliveryStats } from "@/lib/rider/queries";
import { getRiderBalance, getRiderLedger, fromPoisha } from "@/lib/rider/ledger";
import { statusLabel } from "@/lib/orders/status-flow";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Delivery history" };

function formatBalance(balancePoisha: number): string {
  if (balancePoisha === 0) return "All settled";
  const amount = formatBDT(Math.abs(fromPoisha(balancePoisha)));
  return balancePoisha > 0 ? `You owe Pick Up ${amount}` : `Pick Up owes you ${amount}`;
}

const LEDGER_TYPE_LABELS: Record<string, string> = {
  CASH_HANDOVER: "Cash handover",
  PAYOUT: "Payout",
  ADJUSTMENT: "Adjustment",
};

export default async function RiderHistoryPage() {
  const user = await getCurrentUser();
  // See rider/(dashboard)/page.tsx — unreachable today (layout redirects
  // first), kept as a non-silent fallback.
  if (!user?.riderProfile) redirect("/rider/register");

  const [history, stats, balancePoisha, ledger] = await Promise.all([
    getRiderHistory(user.riderProfile.id),
    getRiderDeliveryStats(user.riderProfile.id),
    getRiderBalance(user.riderProfile.id),
    getRiderLedger(user.riderProfile.id),
  ]);

  const deliveryEntries = ledger.filter((e) => e.type === "DELIVERY_EARNING" || e.type === "DELIVERY_REVERSAL");
  const moneyEntries = ledger.filter((e) => e.type === "CASH_HANDOVER" || e.type === "PAYOUT" || e.type === "ADJUSTMENT");
  const entryByDeliveryId = new Map(deliveryEntries.filter((e) => e.type === "DELIVERY_EARNING").map((e) => [e.deliveryId, e]));

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Delivery history</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-bg text-brand-primary">
              <Wallet className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs text-gray-500">Balance</p>
              <p className="font-heading text-lg font-bold text-brand-dark">{formatBalance(balancePoisha)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-bg text-brand-primary">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs text-gray-500">Delivered today</p>
              <p className="font-heading text-lg font-bold text-brand-dark">{stats.deliveredToday}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-bg text-brand-primary">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs text-gray-500">Delivered all-time</p>
              <p className="font-heading text-lg font-bold text-brand-dark">{stats.deliveredTotal}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-heading text-lg font-bold text-brand-dark">Deliveries</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No completed deliveries yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((order) => {
              const entry = order.delivery ? entryByDeliveryId.get(order.delivery.id) : undefined;
              return (
                <div key={order.id} className="rounded-card border border-border-brand bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-brand-dark">{order.vendor.businessName}</p>
                      <p className="text-xs text-gray-500">{order.customer.name} · {order.orderNumber}</p>
                    </div>
                    <Badge variant={order.status === "DELIVERED" ? "brand" : "danger"}>{statusLabel(order.status)}</Badge>
                  </div>
                  {entry && order.delivery && (
                    <div className="mt-2 grid grid-cols-3 gap-2 border-t border-border-brand pt-2 text-xs text-gray-600">
                      <span>Collected: {formatBDT(fromPoisha(entry.amountPoisha))}</span>
                      <span>Earned: {order.delivery.riderEarningPoisha != null ? formatBDT(fromPoisha(order.delivery.riderEarningPoisha)) : "—"}</span>
                      <span>{entry.balanceImpactPoisha >= 0 ? "You owe" : "Owed to you"}: {formatBDT(Math.abs(fromPoisha(entry.balanceImpactPoisha)))}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-heading text-lg font-bold text-brand-dark">Handovers & payouts</h2>
        {moneyEntries.length === 0 ? (
          <p className="text-sm text-gray-500">No handovers or payouts recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {moneyEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-card border border-border-brand bg-white p-4">
                <div>
                  <p className="text-sm font-semibold text-brand-dark">{LEDGER_TYPE_LABELS[entry.type] ?? entry.type}</p>
                  <p className="text-xs text-gray-500">
                    {entry.occurredAt.toLocaleDateString("en-BD", { dateStyle: "medium" })}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold text-brand-dark">{formatBDT(fromPoisha(entry.amountPoisha))}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
