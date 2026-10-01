import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { getRiderBalance, getRiderLedger, fromPoisha } from "@/lib/rider/ledger";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Balance" };

const TYPE_LABELS: Record<string, string> = {
  DELIVERY_EARNING: "Delivery earning",
  DELIVERY_REVERSAL: "Delivery reversal",
  CASH_HANDOVER: "Cash handover to Pick Up",
  PAYOUT: "Payout received",
  ADJUSTMENT: "Adjustment",
};

function formatBalance(balancePoisha: number): string {
  if (balancePoisha === 0) return "All settled";
  const amount = formatBDT(Math.abs(fromPoisha(balancePoisha)));
  return balancePoisha > 0 ? `You owe Pick Up ${amount}` : `Pick Up owes you ${amount}`;
}

export default async function RiderBalancePage() {
  const user = await getCurrentUser();
  if (!user?.riderProfile) redirect("/rider/register");

  const [balancePoisha, ledger] = await Promise.all([
    getRiderBalance(user.riderProfile.id),
    getRiderLedger(user.riderProfile.id),
  ]);

  // `ledger` is newest-first. Anchor the running balance to the current
  // (ground-truth) balance and walk backwards, so it's always correct even
  // if `getRiderLedger`'s take-limit ever truncates older entries.
  const rows = ledger.reduce<{ entry: (typeof ledger)[number]; balanceAfterPoisha: number }[]>((acc, entry) => {
    const runningBefore = acc.length === 0 ? balancePoisha : acc[acc.length - 1].balanceAfterPoisha - acc[acc.length - 1].entry.balanceImpactPoisha;
    acc.push({ entry, balanceAfterPoisha: runningBefore });
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Balance</h1>

      <Card>
        <CardContent className="flex items-center gap-3 pt-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-bg text-brand-primary">
            <Wallet className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs text-gray-500">Current balance</p>
            <p className="font-heading text-lg font-bold text-brand-dark">{formatBalance(balancePoisha)}</p>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 font-heading text-lg font-bold text-brand-dark">Full statement</h2>
        <p className="mb-3 text-xs text-gray-500">
          Every delivery earning, cash handover, and payout, newest first, with your running balance after each one. A positive balance means you owe Pick Up (cash you
          collected but haven&apos;t handed over yet); a negative balance means Pick Up owes you.
        </p>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">No ledger activity yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map(({ entry, balanceAfterPoisha }) => (
              <div key={entry.id} className="rounded-card border border-border-brand bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-brand-dark">{TYPE_LABELS[entry.type] ?? entry.type}</p>
                    <p className="text-xs text-gray-500">
                      {entry.delivery?.order.vendor.businessName ?? entry.note ?? "—"}
                      {entry.delivery?.order.orderNumber && ` · ${entry.delivery.order.orderNumber}`}
                    </p>
                    <p className="text-xs text-gray-400">{entry.occurredAt.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading font-bold text-brand-dark">{formatBDT(fromPoisha(entry.amountPoisha))}</p>
                    <p className="text-xs text-gray-500">
                      {entry.balanceImpactPoisha >= 0 ? "+" : "−"}
                      {formatBDT(Math.abs(fromPoisha(entry.balanceImpactPoisha)))} to balance
                    </p>
                  </div>
                </div>
                <div className="mt-2 border-t border-border-brand pt-2 text-xs text-gray-600">
                  Balance after: <span className="font-semibold text-brand-dark">{formatBalance(balanceAfterPoisha)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
