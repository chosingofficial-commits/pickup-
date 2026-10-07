import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { AdvertisementRequestForm, type PlacementOption } from "./advertisement-request-form";
import { AdCard } from "@/components/ads/ad-card";
import { formatBDT } from "@/lib/utils";

/**
 * The pricing table + request form (or a login prompt, for a logged-out
 * visitor), shared by the public /advertise page and the vendor/rider
 * dashboard "create a new ad" pages — the only things that differ per
 * caller are whether a visitor is already logged in and what to prefill.
 */
export function AdRequestPanel({
  placementOptions,
  loginHref,
  defaults,
}: {
  placementOptions: PlacementOption[];
  /** Omit when the caller is always logged in (e.g. inside a dashboard) — the login prompt branch never renders. */
  loginHref?: string;
  /** Omit to show the logged-out prompt instead of the form. */
  defaults?: { phone: string; businessName?: string };
}) {
  return (
    <>
      {placementOptions.length > 0 && (
        <div className="relative z-0 mt-8 overflow-x-auto rounded-card border border-border-brand bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border-brand bg-surface-muted text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Placement</th>
                <th className="px-4 py-2.5 font-semibold">Daily</th>
                <th className="px-4 py-2.5 font-semibold">Weekly</th>
                <th className="px-4 py-2.5 font-semibold">Monthly</th>
              </tr>
            </thead>
            <tbody>
              {placementOptions.map((p) => (
                <tr key={p.code} className="border-b border-border-brand last:border-0">
                  <td className="px-4 py-2.5 font-medium text-brand-dark">{p.name}</td>
                  <td className="px-4 py-2.5 text-gray-700">{p.dailyPrice > 0 ? formatBDT(p.dailyPrice) : "—"}</td>
                  <td className="px-4 py-2.5 text-gray-700">{p.weeklyPrice > 0 ? formatBDT(p.weeklyPrice) : "—"}</td>
                  <td className="px-4 py-2.5 text-gray-700">{p.monthlyPrice > 0 ? formatBDT(p.monthlyPrice) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Card className="mt-6">
        <CardContent className="pt-5">
          {placementOptions.length === 0 ? (
            <p className="text-sm text-gray-600">Advertising isn&apos;t open right now — please check back soon.</p>
          ) : !defaults ? (
            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-gray-700">
                  Log in or create a free account to submit an ad — this links your request to your account so you can
                  track its status, payment, and performance under &ldquo;My ads&rdquo;.
                </p>
                <Link
                  href={loginHref ?? "/login"}
                  className="rounded-control bg-brand-primary px-6 py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover"
                >
                  Log in or sign up to place an ad
                </Link>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Live preview</p>
                <AdCard ad={{ title: "Your business", imageUrl: "", advertiserName: "Your business name" }} />
                <p className="mt-2 text-xs text-gray-500">This is how your ad will appear to customers.</p>
              </div>
            </div>
          ) : (
            <AdvertisementRequestForm defaults={defaults} placements={placementOptions} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
