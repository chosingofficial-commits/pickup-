import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { AdPricingInput } from "@/components/admin/ad-pricing-input";
import { toggleAdPlacementActiveAction } from "@/lib/actions/admin-advertising";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Ad placements & pricing" };

export default async function AdminAdPlacementsPage() {
  const placements = await db.adPlacement.findMany({ include: { pricing: true }, orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Placements & pricing</h1>
      <div className="space-y-3">
        {placements.map((placement) => (
          <div key={placement.id} className="rounded-card border border-border-brand bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-dark">{placement.name}</p>
                <p className="text-xs text-gray-500">
                  Desktop {placement.desktopWidth}×{placement.desktopHeight} · Mobile {placement.mobileWidth}×{placement.mobileHeight}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={placement.isActive ? "brand" : "outline"}>{placement.isActive ? "Active" : "Inactive"}</Badge>
                <form action={toggleAdPlacementActiveAction}>
                  <input type="hidden" name="placementId" value={placement.id} />
                  <button type="submit" className="rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
                    {placement.isActive ? "Disable" : "Enable"}
                  </button>
                </form>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              {placement.pricing.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-14">{p.billingCycle}</span>
                  <AdPricingInput pricingId={p.id} price={Number(p.price)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
