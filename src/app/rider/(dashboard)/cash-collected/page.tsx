import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { getTodayCashCollectedEntries, getTodayCashCollected, fromPoisha } from "@/lib/rider/ledger";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Cash collected today" };

export default async function RiderCashCollectedPage() {
  const user = await getCurrentUser();
  if (!user?.riderProfile) redirect("/rider/register");

  const [entries, totalPoisha] = await Promise.all([
    getTodayCashCollectedEntries(user.riderProfile.id),
    getTodayCashCollected(user.riderProfile.id),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Cash collected today</h1>

      <Card>
        <CardContent className="flex items-center gap-3 pt-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-bg text-brand-primary">
            <Wallet className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs text-gray-500">Total cash on hand (today&apos;s COD deliveries)</p>
            <p className="font-heading text-lg font-bold text-brand-dark">{formatBDT(fromPoisha(totalPoisha))}</p>
          </div>
        </CardContent>
      </Card>

      {entries.length === 0 ? (
        <div className="rounded-card border border-border-brand bg-white p-10 text-center">
          <Wallet className="mx-auto h-10 w-10 text-gray-300" aria-hidden />
          <p className="mt-2 text-sm text-gray-600">You haven&apos;t collected any cash-on-delivery payments today yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between rounded-card border border-border-brand bg-white p-4">
              <div>
                <p className="text-sm font-semibold text-brand-dark">{entry.delivery?.order.orderNumber ?? "—"}</p>
                <p className="text-xs text-gray-500">
                  {entry.delivery?.order.vendor.businessName}
                  {entry.delivery?.order.customer.name && ` · ${entry.delivery.order.customer.name}`}
                </p>
                <p className="text-xs text-gray-400">{entry.occurredAt.toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <span className="font-heading font-bold text-brand-dark">{formatBDT(fromPoisha(entry.amountPoisha))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
