import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { cancelAdCampaignAction } from "@/lib/actions/admin-advertising";
import { MarkAdPaymentPaidForm, PauseResumeCampaignForm, EditCampaignDatesForm } from "@/components/admin/ad-campaign-actions";
import { AdCard } from "@/components/ads/ad-card";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/utils";
import { syncAdCampaignLifecycle } from "@/lib/ads/lifecycle";

export const metadata: Metadata = { title: "Ad campaigns" };

function toBdDateInput(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" }); // en-CA gives YYYY-MM-DD
}

const BADGE_VARIANT: Record<string, "brand" | "outline" | "danger" | "accent"> = {
  ACTIVE: "brand",
  PAUSED: "accent",
  CANCELLED: "danger",
  EXPIRED: "outline",
};

export default async function AdminAdvertisingCampaignsPage() {
  await syncAdCampaignLifecycle();
  const advertisements = await db.advertisement.findMany({
    where: { campaigns: { some: {} } },
    include: { advertiser: true, campaigns: { include: { placement: true, payments: true, impressions: true, clicks: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Ad campaigns</h1>

      {advertisements.length === 0 ? (
        <p className="text-sm text-gray-500">No campaigns yet.</p>
      ) : (
        <div className="space-y-3">
          {advertisements.map((ad) => (
            <div key={ad.id} className="rounded-card border border-border-brand bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-wrap items-start gap-4">
                  <a
                    href={`/admin/advertising/photo/${ad.id}`}
                    target="_blank"
                    rel="noopener"
                    className="block w-40 shrink-0"
                    title="Open full-size image"
                  >
                    <AdCard ad={{ title: ad.title, imageUrl: `/admin/advertising/photo/${ad.id}`, advertiserName: ad.advertiser.businessName }} />
                  </a>
                  <div>
                    <p className="text-sm font-semibold text-brand-dark">{ad.title}</p>
                    <p className="text-xs text-gray-500">
                      {ad.advertiser.businessName} · {ad.advertiser.phone}
                      {ad.advertiser.email ? ` · ${ad.advertiser.email}` : ""} · {ad.preferredPlacementCode.replaceAll("_", " ")}
                    </p>
                  </div>
                </div>
                <Badge variant={ad.status === "ACTIVE" ? "brand" : ad.status === "REJECTED" ? "danger" : "accent"}>{ad.status}</Badge>
              </div>

              <div className="mt-3 space-y-2 border-t border-border-brand pt-3">
                {ad.campaigns.map((campaign) => {
                  const payment = campaign.payments[0];
                  const impressions = campaign.impressions.length;
                  const clicks = campaign.clicks.length;
                  const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) : "0.0";
                  const isPaused = campaign.status === "PAUSED";
                  const canPauseResume = campaign.status === "ACTIVE" || campaign.status === "SCHEDULED" || isPaused;
                  const canEditDates = campaign.status !== "CANCELLED" && campaign.status !== "EXPIRED";

                  return (
                    <div key={campaign.id} className="rounded-control bg-surface-muted p-2.5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          {campaign.placement.name} · {toBdDateInput(campaign.startDate)} – {toBdDateInput(campaign.endDate)} (BD time) ·{" "}
                          {impressions} views · {clicks} clicks · {ctr}% CTR
                        </span>
                        <Badge variant={BADGE_VARIANT[campaign.status] ?? "outline"}>{campaign.status}</Badge>
                      </div>
                      {payment && (
                        <p className="mt-1 text-gray-500">
                          Payment: {payment.status}
                          {payment.status === "PAID" && payment.providerRef ? ` · ${payment.provider} · Ref: ${payment.providerRef}` : payment.status === "PAID" ? ` · ${payment.provider}` : ""}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {payment && payment.status !== "PAID" && <MarkAdPaymentPaidForm paymentId={payment.id} amountLabel={formatBDT(payment.amount)} />}
                        {canPauseResume && <PauseResumeCampaignForm campaignId={campaign.id} isPaused={isPaused} />}
                        {canEditDates && (
                          <EditCampaignDatesForm campaignId={campaign.id} startDate={toBdDateInput(campaign.startDate)} endDate={toBdDateInput(campaign.endDate)} />
                        )}
                        {campaign.status !== "CANCELLED" && campaign.status !== "EXPIRED" && (
                          <form action={cancelAdCampaignAction}>
                            <input type="hidden" name="campaignId" value={campaign.id} />
                            <button type="submit" className="rounded-control border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                              Cancel
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
