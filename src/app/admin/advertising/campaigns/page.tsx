import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { markAdPaymentPaidAction, cancelAdCampaignAction } from "@/lib/actions/admin-advertising";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Ad campaigns" };

export default async function AdminAdvertisingCampaignsPage() {
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
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-brand-dark">{ad.title}</p>
                  <p className="text-xs text-gray-500">
                    {ad.advertiser.businessName} · {ad.advertiser.email} · {ad.preferredPlacementCode.replaceAll("_", " ")}
                  </p>
                </div>
                <Badge variant={ad.status === "ACTIVE" ? "brand" : ad.status === "REJECTED" ? "danger" : "accent"}>{ad.status}</Badge>
              </div>

              <div className="mt-3 space-y-2 border-t border-border-brand pt-3">
                {ad.campaigns.map((campaign) => {
                  const payment = campaign.payments[0];
                  const impressions = campaign.impressions.length;
                  const clicks = campaign.clicks.length;
                  const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) : "0.0";
                  return (
                    <div key={campaign.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-surface-muted p-2.5 text-xs">
                      <span>
                        {campaign.placement.name} · {campaign.startDate.toLocaleDateString("en-BD")} – {campaign.endDate.toLocaleDateString("en-BD")} ·{" "}
                        {impressions} impressions · {clicks} clicks · {ctr}% CTR
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant={campaign.status === "ACTIVE" ? "brand" : "outline"}>{campaign.status}</Badge>
                        {payment && payment.status !== "PAID" && (
                          <form action={markAdPaymentPaidAction}>
                            <input type="hidden" name="paymentId" value={payment.id} />
                            <button type="submit" className="rounded-control bg-brand-dark px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90">
                              Mark paid ({formatBDT(payment.amount)})
                            </button>
                          </form>
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
