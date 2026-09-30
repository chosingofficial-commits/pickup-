import "server-only";

export type AdDisplayStatus =
  | { kind: "waiting_review" }
  | { kind: "not_approved"; reason: string }
  | { kind: "waiting_payment" }
  | { kind: "scheduled"; startDate: Date }
  | { kind: "running"; daysLeft: number }
  | { kind: "paused" }
  | { kind: "ended" };

export const AD_DISPLAY_STATUS_LABEL: Record<AdDisplayStatus["kind"], string> = {
  waiting_review: "Waiting for review",
  not_approved: "Not approved",
  waiting_payment: "Approved – waiting for payment",
  scheduled: "Scheduled",
  running: "Running",
  paused: "Paused",
  ended: "Ended",
};

type CampaignForStatus = {
  status: string;
  startDate: Date;
  endDate: Date;
  payments: { status: string }[];
};

/**
 * "My ads" shows one of a small set of plain-language statuses. Before a
 * campaign exists, this is driven by the Advertisement's own status; once
 * one does, the campaign + its payment are the source of truth (the
 * Advertisement's status field can otherwise lag behind pause/resume/
 * date-edit, which only ever touch the campaign — see admin-advertising.ts).
 */
export function computeAdDisplayStatus(
  ad: { status: string; rejectionReason: string | null },
  campaign: CampaignForStatus | null,
  now: Date = new Date(),
): AdDisplayStatus {
  if (!campaign) {
    if (ad.status === "REJECTED") return { kind: "not_approved", reason: ad.rejectionReason ?? "" };
    if (ad.status === "APPROVED") return { kind: "waiting_payment" };
    return { kind: "waiting_review" };
  }

  const isPaid = campaign.payments.some((p) => p.status === "PAID");
  if (!isPaid) return { kind: "waiting_payment" };
  if (campaign.status === "PAUSED") return { kind: "paused" };
  if (campaign.status === "CANCELLED" || campaign.status === "EXPIRED") return { kind: "ended" };
  if (campaign.status === "SCHEDULED") return { kind: "scheduled", startDate: campaign.startDate };

  const daysLeft = Math.max(1, Math.ceil((campaign.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
  return { kind: "running", daysLeft };
}
