import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { AdvertisementRequestForm } from "@/components/advertise/advertisement-request-form";
import { AdCard } from "@/components/ads/ad-card";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Advertise on Pick Up" };

export default async function AdvertisePage() {
  const [user, placements] = await Promise.all([
    getCurrentUser(),
    db.adPlacement.findMany({
      where: { isActive: true },
      include: {
        pricing: true,
        // SCHEDULED/ACTIVE/PAUSED campaigns still occupy a paid slot —
        // CANCELLED/EXPIRED don't (see checkPlacementCapacity, the same
        // set admin's capacity gate uses).
        campaigns: { where: { status: { in: ["SCHEDULED", "ACTIVE", "PAUSED"] } }, select: { startDate: true, endDate: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const placementOptions = placements.map((p) => ({
    code: p.code,
    name: p.name,
    dailyPrice: Number(p.pricing.find((pr) => pr.billingCycle === "DAILY")?.price ?? 0),
    weeklyPrice: Number(p.pricing.find((pr) => pr.billingCycle === "WEEKLY")?.price ?? 0),
    monthlyPrice: Number(p.pricing.find((pr) => pr.billingCycle === "MONTHLY")?.price ?? 0),
    maxConcurrentAds: p.maxConcurrentAds,
    bookedRanges: p.campaigns.map((c) => ({ start: c.startDate.toISOString(), end: c.endDate.toISOString() })),
  }));

  return (
    <Container className="py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-heading text-2xl font-bold text-brand-dark">Promote your business on Pick Up</h1>
        <p className="relative z-0 mb-2 mt-1 text-sm text-gray-600">
          Reach customers across Khagrachari Sadar with a featured ad card on our homepage or marketplace. Every ad is
          reviewed for content and requires payment before it goes live — submitting a request doesn&apos;t publish it
          automatically.
        </p>

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
                {placements.map((p) => (
                  <tr key={p.id} className="border-b border-border-brand last:border-0">
                    <td className="px-4 py-2.5 font-medium text-brand-dark">{p.name}</td>
                    {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((cycle) => {
                      const price = p.pricing.find((pr) => pr.billingCycle === cycle)?.price;
                      return (
                        <td key={cycle} className="px-4 py-2.5 text-gray-700">
                          {price != null ? formatBDT(Number(price)) : "—"}
                        </td>
                      );
                    })}
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
            ) : !user ? (
              <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
                <div className="flex flex-col items-start gap-3">
                  <p className="text-sm text-gray-700">
                    Log in or create a free account to submit an ad — this links your request to your account so you can
                    track its status, payment, and performance under &ldquo;My ads&rdquo;.
                  </p>
                  <Link
                    href="/login?next=/advertise"
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
              <AdvertisementRequestForm defaults={{ phone: user.phone ?? "" }} placements={placementOptions} />
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
