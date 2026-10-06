import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Wallet, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth/session";
import { getRiderHistory, getRiderDeliveryStats } from "@/lib/rider/queries";
import { getRiderBalance, getRiderLedger, formatCollectedLabel, fromPoisha } from "@/lib/rider/ledger";
import { getPeriodStart } from "@/lib/rider/balance";
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

export default async function RiderHistoryPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const user = await getCurrentUser();
  // See rider/(dashboard)/page.tsx — unreachable today (layout redirects
  // first), kept as a non-silent fallback.
  if (!user?.riderProfile) redirect("/rider/register");

  const { period } = await searchParams;
  // "today" mirrors the dashboard's "Delivered today" card exactly: DELIVERED
  // only, since the start of today in Bangladesh time — so the list length
  // here always matches that card's number.
  const isToday = period === "today";

  const [history, stats, balancePoisha, ledger] = await Promise.all([
    getRiderHistory(user.riderProfile.id, isToday ? { since: getPeriodStart("today"), statusIn: ["DELIVERED"] } : undefined),
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
        <StatCard icon={Wallet} label="Balance" value={formatBalance(balancePoisha)} href="/rider/balance" />
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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-brand-dark">{isToday ? "Delivered today" : "Deliveries"}</h2>
          {isToday && (
            <Link href="/rider/history" className="text-sm font-semibold text-brand-primary hover:underline">
              View all
            </Link>
          )}
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">{isToday ? "No deliveries completed today yet." : "No completed deliveries yet."}</p>
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
                    <div className="mt-2 grid grid-cols-1 gap-1 border-t border-border-brand pt-2 text-xs text-gray-600 sm:grid-cols-3 sm:gap-2">
                      <span>{formatCollectedLabel(order.delivery.isCod, entry.amountPoisha)}</span>
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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-brand-dark">Handovers & payouts</h2>
          <Link href="/rider/balance" className="text-sm font-semibold text-brand-primary hover:underline">
            See full balance breakdown
          </Link>
        </div>
        <p className="mb-3 text-xs text-gray-500">
          Your balance above is the running total of every delivery (what you owe for cash collected, minus what you earned) plus the handovers and payouts below — not just the
          deliveries shown higher up.
        </p>
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
