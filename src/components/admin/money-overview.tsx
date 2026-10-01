import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PeriodFilter } from "@/components/admin/period-filter";
import { formatBDT } from "@/lib/utils";
import { fromPoisha } from "@/lib/rider/ledger";
import type { AdminMoneyOverview } from "@/lib/admin/money";
import type { PeriodKey } from "@/lib/date/period";

function StatLink({ label, value, hint, href }: { label: string; value: string; hint?: string; href: string }) {
  return (
    <Link href={href} className="block rounded-control bg-surface-muted p-3 transition-colors hover:bg-brand-bg">
      <p className="text-xs font-semibold text-brand-dark">{label}</p>
      <p className="font-heading text-lg font-bold text-brand-dark">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-gray-500">{hint}</p>}
    </Link>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

export function MoneyOverview({ period, overview }: { period: PeriodKey; overview: AdminMoneyOverview }) {
  const { online, vendor, ad, refunds, rider, platformEarningsTotalTk } = overview;
  const deliveryShareTk = fromPoisha(rider.platformEarningsPoisha);
  const cashCollectedTk = fromPoisha(rider.cashCollectedPoisha);
  const handedOverTk = fromPoisha(rider.receivedFromRidersPoisha);
  const stillWithRidersTk = fromPoisha(rider.stillToCollectPoisha);
  const owedToRidersTk = fromPoisha(rider.weOweRidersPoisha);
  const paidToRidersTk = fromPoisha(rider.paidToRidersPoisha);

  return (
    <Card>
      <CardContent className="space-y-5 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-bold text-brand-dark">Money overview</h2>
          <PeriodFilter basePath="/admin" period={period} />
        </div>

        <Section title="Online payments">
          <StatLink label="Received (real)" value={formatBDT(online.realTk)} hint={`${online.realCount} payment(s)`} href={`/admin/payments?period=${period}`} />
          <StatLink label="Sandbox (not real, excluded above)" value={formatBDT(online.sandboxTk)} hint={`${online.sandboxCount} payment(s)`} href={`/admin/payments?period=${period}`} />
        </Section>

        <Section title="Cash on delivery">
          <StatLink label="Collected by riders" value={formatBDT(cashCollectedTk)} href={`/admin/riders?period=${period}`} />
          <StatLink label="Handed over to Pick Up" value={formatBDT(handedOverTk)} href={`/admin/riders?period=${period}`} />
          <StatLink label="Still with riders" value={formatBDT(stillWithRidersTk)} hint="Current balances, all time" href="/admin/riders?status=owes" />
        </Section>

        <Section title="Vendors">
          <StatLink label="Owed to vendors" value={formatBDT(vendor.vendorsOwedAllTimeTk)} hint="Current balance, all time" href="/admin/payouts" />
          <StatLink label="Paid to vendors" value={formatBDT(vendor.vendorsPaidPeriodTk)} href="/admin/payouts" />
        </Section>

        <Section title="Riders">
          <StatLink label="Owed to riders" value={formatBDT(owedToRidersTk)} hint="Current balance, all time" href="/admin/riders?status=weOwe" />
          <StatLink label="Paid to riders" value={formatBDT(paidToRidersTk)} href={`/admin/riders?period=${period}`} />
        </Section>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Pick Up&apos;s own earnings</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <StatLink label="Vendor commission" value={formatBDT(vendor.commissionPeriodTk)} href="/admin/payouts" />
            <StatLink label="Delivery fee share" value={formatBDT(deliveryShareTk)} href={`/admin/riders?period=${period}`} />
            <StatLink label="Ad income (real)" value={formatBDT(ad.realTk)} hint={ad.sandboxTk > 0 ? `+ ${formatBDT(ad.sandboxTk)} sandbox, excluded` : undefined} href="/admin/advertising/campaigns" />
            <div className="rounded-control border-2 border-dashed border-border-brand p-3">
              <p className="text-xs font-semibold text-brand-dark">Total earnings</p>
              <p className="font-heading text-lg font-bold text-brand-dark">{formatBDT(platformEarningsTotalTk)}</p>
              <p className="mt-0.5 text-[11px] text-gray-500">Commission + delivery share + real ad income</p>
            </div>
          </div>
        </div>

        <Section title="Refunds">
          <StatLink label="Refunded" value={formatBDT(refunds.totalTk)} hint={`${refunds.count} refund(s)`} href="/admin/refunds" />
        </Section>
      </CardContent>
    </Card>
  );
}
