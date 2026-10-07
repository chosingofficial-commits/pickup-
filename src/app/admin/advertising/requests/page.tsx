import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { RejectAdForm } from "@/components/admin/reject-ad-form";
import { CreateCampaignForm } from "@/components/admin/create-campaign-form";
import { AdCard } from "@/components/ads/ad-card";
import { approveAdvertisementAction } from "@/lib/actions/admin-advertising";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Advertising requests" };

export default async function AdminAdvertisingRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const statusFilter = status === "SUBMITTED" || status === "APPROVED" ? status : undefined;

  const [advertisements, placements] = await Promise.all([
    db.advertisement.findMany({
      where: { campaigns: { none: {} }, ...(statusFilter ? { status: statusFilter } : {}) },
      include: { advertiser: true },
      orderBy: { createdAt: "desc" },
    }),
    db.adPlacement.findMany({ include: { pricing: true }, where: { isActive: true } }),
  ]);

  const placementOptions = placements.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    dailyPrice: Number(p.pricing.find((pr) => pr.billingCycle === "DAILY")?.price ?? 0),
    weeklyPrice: Number(p.pricing.find((pr) => pr.billingCycle === "WEEKLY")?.price ?? 0),
    monthlyPrice: Number(p.pricing.find((pr) => pr.billingCycle === "MONTHLY")?.price ?? 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-heading text-2xl font-bold text-brand-dark">Advertising requests</h1>
        {statusFilter && (
          <Link href="/admin/advertising/requests" className="text-xs font-semibold text-brand-primary hover:underline">
            Showing {statusFilter === "SUBMITTED" ? "new requests" : "approved, awaiting payment"} only — clear filter
          </Link>
        )}
      </div>

      {advertisements.length === 0 ? (
        <p className="text-sm text-gray-500">No pending requests. Running campaigns are under &quot;Ad campaigns&quot;.</p>
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
                    <p className="mt-1 text-xs text-gray-600">{ad.description}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Estimated: {formatBDT(ad.budget)} · Link: {ad.targetUrl}
                    </p>
                  </div>
                </div>
                <Badge variant={ad.status === "REJECTED" ? "danger" : "accent"}>{ad.status}</Badge>
              </div>

              {ad.status === "SUBMITTED" && (
                <div className="mt-3 flex gap-2">
                  <form action={approveAdvertisementAction}>
                    <input type="hidden" name="advertisementId" value={ad.id} />
                    <button type="submit" className="rounded-control bg-brand-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary-hover">
                      Approve
                    </button>
                  </form>
                  <RejectAdForm advertisementId={ad.id} />
                </div>
              )}

              {ad.status === "APPROVED" && (
                <div className="mt-3">
                  <CreateCampaignForm advertisementId={ad.id} placements={placementOptions} />
                </div>
              )}

              {ad.rejectionReason && <p className="mt-2 text-xs text-red-600">Rejected: {ad.rejectionReason}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
