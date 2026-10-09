import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Rating" };

export default async function RiderRatingsPage() {
  const user = await getCurrentUser();
  if (!user?.riderProfile) redirect("/rider/register");

  const [profile, recentRatings] = await Promise.all([
    db.riderProfile.findUnique({
      where: { id: user.riderProfile.id },
      select: { ratingAvg: true, ratingCount: true },
    }),
    db.riderRating.findMany({
      where: { riderId: user.riderProfile.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, rating: true, comment: true, createdAt: true },
    }),
  ]);
  const ratingCount = profile?.ratingCount ?? 0;
  const ratingAvg = profile ? Number(profile.ratingAvg) : 0;

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Rating</h1>

      <Card>
        <CardContent className="flex items-center gap-3 pt-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-bg text-brand-primary">
            <Star className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs text-gray-500">Average rating</p>
            <p className="font-heading text-lg font-bold text-brand-dark">{ratingCount > 0 ? `${ratingAvg.toFixed(1)} (${ratingCount} rating${ratingCount === 1 ? "" : "s"})` : "No ratings yet"}</p>
          </div>
        </CardContent>
      </Card>

      {ratingCount === 0 ? (
        <div className="rounded-card border border-border-brand bg-white p-10 text-center">
          <Star className="mx-auto h-10 w-10 text-gray-300" aria-hidden />
          <p className="mt-2 text-sm text-gray-600">You haven&apos;t received any ratings yet.</p>
          <p className="mt-1 text-xs text-gray-500">Keep delivering on time and your rating will show up here.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-0.5" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-5 w-5 ${i < Math.round(ratingAvg) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
            ))}
          </div>

          <div>
            <h2 className="mb-3 font-heading text-lg font-bold text-brand-dark">Recent ratings</h2>
            <div className="space-y-2">
              {recentRatings.map((r) => (
                <Card key={r.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-0.5" aria-hidden>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">{r.createdAt.toLocaleDateString("en-BD", { dateStyle: "medium" })}</span>
                    </div>
                    {r.comment && <p className="mt-2 text-sm text-gray-700">&ldquo;{r.comment}&rdquo;</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
