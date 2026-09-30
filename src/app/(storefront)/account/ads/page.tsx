import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { AdCard } from "@/components/ads/ad-card";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getSiteSettings, SITE_SETTING_KEYS } from "@/lib/settings";
import { syncAdCampaignLifecycle } from "@/lib/ads/lifecycle";
import { computeAdDisplayStatus, AD_DISPLAY_STATUS_LABEL, type AdDisplayStatus } from "@/lib/ads/status";
import { formatShortBdDate } from "@/lib/ads/availability";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "My ads" };

const STATUS_BADGE_VARIANT: Record<AdDisplayStatus["kind"], BadgeVariant> = {
  waiting_review: "warning",
  not_approved: "danger",
  waiting_payment: "warning",
  scheduled: "outline",
  running: "success",
  paused: "accent",
  ended: "outline",
};

export default async function MyAdsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Catches up any campaign whose start/end date has quietly passed since the
  // last time the homepage/marketplace ran this same sync — so status here
  // always matches reality, not just whatever an admin last clicked.
  await syncAdCampaignLifecycle();

  const [advertiser, settings] = await Promise.all([
    db.advertiser.findUnique({
      where: { userId: user.id },
      include: {
        advertisements: {
          orderBy: { createdAt: "desc" },
          include: {
            campaigns: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                placement: true,
                payments: { orderBy: { createdAt: "desc" }, take: 1 },
                _count: { select: { clicks: true } },
              },
            },
          },
        },
      },
    }),
    getSiteSettings(),
  ]);

  const ads = advertiser?.advertisements ?? [];
  const businessName = advertiser?.businessName ?? "";

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">My ads</h1>

      {ads.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-gray-600">You haven&apos;t submitted any ads yet.</p>
            <Link
              href="/advertise"
              className="mt-4 inline-block rounded-control bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-hover"
            >
              Advertise on Pick Up
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {ads.map((ad) => {
            const campaign = ad.campaigns[0] ?? null;
            const displayStatus = computeAdDisplayStatus(ad, campaign);
            const payment = campaign?.payments[0];
            const placementName = campaign?.placement.name ?? ad.preferredPlacementCode.replaceAll("_", " ");
            const startDate = campaign?.startDate ?? ad.requestedStartDate;
            const endDate = campaign?.endDate ?? ad.requestedEndDate;
            const clicks = campaign?._count.clicks ?? 0;
            const isPaid = payment?.status === "PAID";
            const price = Number(payment?.amount ?? ad.budget);

            return (
              <Card key={ad.id}>
                <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row">
                  <div className="w-full shrink-0 sm:w-48">
                    <AdCard ad={{ title: ad.title, imageUrl: `/account/ads/photo/${ad.id}`, advertiserName: businessName }} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-brand-dark">{ad.title}</p>
                      <Badge variant={STATUS_BADGE_VARIANT[displayStatus.kind]}>{AD_DISPLAY_STATUS_LABEL[displayStatus.kind]}</Badge>
                    </div>

                    {displayStatus.kind === "not_approved" && (
                      <p className="text-sm text-red-600">Reason: {displayStatus.reason || "No reason given."}</p>
                    )}

                    <p className="text-xs text-gray-500">
                      {placementName}
                      {startDate && endDate && (
                        <>
                          {" · "}
                          {formatShortBdDate(startDate)} – {formatShortBdDate(endDate)} (Bangladesh time)
                        </>
                      )}
                    </p>

                    {displayStatus.kind === "running" && (
                      <p className="text-xs font-medium text-brand-primary">
                        {displayStatus.daysLeft} day{displayStatus.daysLeft === 1 ? "" : "s"} left
                      </p>
                    )}
                    {displayStatus.kind === "scheduled" && (
                      <p className="text-xs text-gray-500">Starts on {formatShortBdDate(displayStatus.startDate)}</p>
                    )}

                    <p className="text-xs text-gray-500">
                      Price: {formatBDT(price)}
                      {payment ? ` · ${isPaid ? "Paid" : "Unpaid"}` : " (estimated)"}
                      {" · "}
                      {clicks} click{clicks === 1 ? "" : "s"} so far
                    </p>

                    {displayStatus.kind === "waiting_payment" && (
                      <p className="rounded-control bg-brand-bg px-3 py-2 text-xs text-brand-dark">
                        {settings[SITE_SETTING_KEYS.adPaymentInstructions]}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
