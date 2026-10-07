import type { Metadata } from "next";
import Link from "next/link";
import { DollarSign, Clock3, AlertCircle, Megaphone, CalendarClock, CalendarX, Layers } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { PeriodFilter } from "@/components/admin/period-filter";
import {
  getAdIncomeOverview,
  getAdsNeedingAction,
  getRunningAdsByPlacement,
  getPlacementFreeSlots,
  getCampaignsStartingSoon,
  getCampaignsEndingSoon,
} from "@/lib/admin/advertising-overview";
import { PERIOD_KEYS, type PeriodKey } from "@/lib/date/period";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Advertising overview" };

function Stat({ icon: Icon, label, value, href }: { icon: React.ElementType; label: string; value: string; href: string }) {
  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-lifted">
        <CardContent className="flex items-center gap-3 pt-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-bg text-brand-primary">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="font-heading text-lg font-bold text-brand-dark">{value}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function toBdDate(d: Date): string {
  return d.toLocaleDateString("en-BD", { timeZone: "Asia/Dhaka", day: "numeric", month: "short" });
}

export default async function AdminAdvertisingOverviewPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period: periodRaw } = await searchParams;
  const period: PeriodKey = (PERIOD_KEYS as string[]).includes(periodRaw ?? "") ? (periodRaw as PeriodKey) : "today";

  const [income, needsAction, runningByPlacement, freeSlots, startingSoon, endingSoon] = await Promise.all([
    getAdIncomeOverview(period),
    getAdsNeedingAction(),
    getRunningAdsByPlacement(),
    getPlacementFreeSlots(),
    getCampaignsStartingSoon(),
    getCampaignsEndingSoon(),
  ]);

  const totalRunning = runningByPlacement.reduce((s, p) => s + p.runningCount, 0);
  const totalClicks = runningByPlacement.reduce((s, p) => s + p.clicks, 0);
  const totalViews = runningByPlacement.reduce((s, p) => s + p.views, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-brand-dark">Advertising overview</h1>
        <PeriodFilter basePath="/admin/advertising" period={period} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={DollarSign} label="Ad income (paid)" value={formatBDT(income.paidTk)} href="/admin/advertising/campaigns?paid=1" />
        <Stat icon={Clock3} label="Expected (approved, unpaid)" value={formatBDT(income.expectedTk)} href="/admin/advertising/campaigns?pendingPayment=1" />
        <Stat icon={Megaphone} label="Ads running now" value={String(totalRunning)} href="/admin/advertising/campaigns?status=ACTIVE" />
        <Stat icon={Layers} label="Clicks / views (running)" value={`${totalClicks} / ${totalViews}`} href="/admin/advertising/campaigns?status=ACTIVE" />
      </div>

      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-4">Needs action</CardTitle>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href="/admin/advertising/requests?status=SUBMITTED"
              className="rounded-control border border-border-brand p-3 hover:bg-brand-bg"
            >
              <p className="text-xs text-gray-500">New requests to review</p>
              <p className="font-heading text-xl font-bold text-brand-dark">{needsAction.newRequests}</p>
            </Link>
            <Link
              href="/admin/advertising/requests?status=APPROVED"
              className="rounded-control border border-border-brand p-3 hover:bg-brand-bg"
            >
              <p className="text-xs text-gray-500">Approved, awaiting payment</p>
              <p className="font-heading text-xl font-bold text-brand-dark">{needsAction.approvedAwaitingPayment}</p>
            </Link>
            <Link
              href="/admin/advertising/campaigns?pendingPayment=1"
              className="rounded-control border border-border-brand p-3 hover:bg-brand-bg"
            >
              <p className="text-xs text-gray-500">Paid awaiting confirmation</p>
              <p className="font-heading text-xl font-bold text-brand-dark">{needsAction.paidAwaitingPaymentConfirmation}</p>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <div className="mb-4 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-gray-400" aria-hidden />
              <CardTitle>Starting soon (next 3 days)</CardTitle>
            </div>
            {startingSoon.length === 0 ? (
              <p className="text-sm text-gray-500">Nothing scheduled to start in the next 3 days.</p>
            ) : (
              <div className="space-y-2">
                {startingSoon.map((c) => (
                  <Link
                    key={c.id}
                    href={`/admin/advertising/campaigns?status=SCHEDULED`}
                    className="flex items-center justify-between rounded-control border border-border-brand p-2.5 text-sm hover:bg-brand-bg"
                  >
                    <span className="text-brand-dark">{c.title}</span>
                    <span className="text-xs text-gray-500">{c.placementName} · {toBdDate(c.date)}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="mb-4 flex items-center gap-2">
              <CalendarX className="h-4 w-4 text-gray-400" aria-hidden />
              <CardTitle>Ending in the next 3 days</CardTitle>
            </div>
            {endingSoon.length === 0 ? (
              <p className="text-sm text-gray-500">Nothing ending in the next 3 days.</p>
            ) : (
              <div className="space-y-2">
                {endingSoon.map((c) => (
                  <Link
                    key={c.id}
                    href={`/admin/advertising/campaigns?status=ACTIVE`}
                    className="flex items-center justify-between rounded-control border border-border-brand p-2.5 text-sm hover:bg-brand-bg"
                  >
                    <span className="text-brand-dark">{c.title}</span>
                    <span className="text-xs text-gray-500">{c.placementName} · {toBdDate(c.date)}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-gray-400" aria-hidden />
            <CardTitle>Free slots per placement</CardTitle>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {freeSlots.map((p) => (
              <Link
                key={p.code}
                href={`/admin/advertising/campaigns?placement=${p.code}`}
                className="flex items-center justify-between rounded-control border border-border-brand p-3 text-sm hover:bg-brand-bg"
              >
                <span className="text-brand-dark">{p.name}</span>
                <span className={`font-semibold ${p.used >= p.max ? "text-red-600" : "text-brand-dark"}`}>
                  {p.used} of {p.max} used
                </span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
