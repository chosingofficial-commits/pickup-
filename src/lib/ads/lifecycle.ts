import "server-only";
import { db } from "@/lib/db";

type TransitionRow = { id: string; advertisementId: string };

/**
 * Flips SCHEDULED campaigns whose start date has arrived to ACTIVE, and
 * ACTIVE campaigns whose end date has passed to EXPIRED — then notifies each
 * advertiser. There's no scheduler in this deployment, so this opportunistic
 * catch-up on read (called from the homepage/marketplace carousel query, the
 * advertiser's "My ads" page, and the admin campaigns page) is what keeps
 * campaign status accurate and timely without one.
 *
 * Safe under concurrent calls: each UPDATE...RETURNING only reports the rows
 * IT actually flipped (Postgres re-evaluates the WHERE per statement, so a
 * row already moved by another concurrent call won't match again here) — so
 * two page loads racing around the same moment can't send duplicate
 * notifications for the same campaign.
 */
export async function syncAdCampaignLifecycle(now: Date = new Date()): Promise<void> {
  const activated = await db.$queryRaw<TransitionRow[]>`
    UPDATE "AdCampaign" SET status = 'ACTIVE', "updatedAt" = ${now}
    WHERE status = 'SCHEDULED' AND "startDate" <= ${now}
    RETURNING id, "advertisementId"
  `;
  const expired = await db.$queryRaw<TransitionRow[]>`
    UPDATE "AdCampaign" SET status = 'EXPIRED', "updatedAt" = ${now}
    WHERE status = 'ACTIVE' AND "endDate" < ${now}
    RETURNING id, "advertisementId"
  `;

  if (activated.length === 0 && expired.length === 0) return;

  await db.$transaction([
    ...activated.map((c) => db.advertisement.update({ where: { id: c.advertisementId }, data: { status: "ACTIVE" } })),
    ...expired.map((c) => db.advertisement.update({ where: { id: c.advertisementId }, data: { status: "EXPIRED" } })),
  ]);

  const toNotify = [
    ...activated.map((c) => ({ advertisementId: c.advertisementId, kind: "started" as const })),
    ...expired.map((c) => ({ advertisementId: c.advertisementId, kind: "ended" as const })),
  ];
  const ads = await db.advertisement.findMany({
    where: { id: { in: toNotify.map((t) => t.advertisementId) } },
    include: { advertiser: true },
  });
  const adById = new Map(ads.map((a) => [a.id, a]));

  const notifications = toNotify.flatMap(({ advertisementId, kind }) => {
    const ad = adById.get(advertisementId);
    if (!ad?.advertiser.userId) return [];
    return [
      {
        userId: ad.advertiser.userId,
        type: "PROMOTION" as const,
        title: kind === "started" ? "Your ad is now running" : "Your ad has ended",
        body:
          kind === "started"
            ? `"${ad.title}" started showing to customers.`
            : `"${ad.title}" has finished its run.`,
        linkUrl: "/account/ads",
      },
    ];
  });
  if (notifications.length > 0) await db.notification.createMany({ data: notifications });
}
