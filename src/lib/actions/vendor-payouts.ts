"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getVendorDashboardStats } from "@/lib/vendor/queries";
import type { ActionState } from "./types";

const payoutSchema = z.object({ amount: z.coerce.number().positive("Enter a valid amount") });

export async function requestPayoutAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user?.vendorProfile) return { status: "error", message: "Please log in." };

  const parsed = payoutSchema.safeParse({ amount: formData.get("amount") });
  if (!parsed.success) return { status: "error", message: "Enter a valid amount." };

  const stats = await getVendorDashboardStats(user.vendorProfile.id);
  const alreadyPending = stats.pendingPayout;
  const alreadyPaidAgg = await db.vendorPayout.aggregate({ where: { vendorId: user.vendorProfile.id, status: "PAID" }, _sum: { amount: true } });
  const available = stats.earnings - alreadyPending - Number(alreadyPaidAgg._sum.amount ?? 0);

  if (parsed.data.amount > available) {
    return { status: "error", message: `You can request up to Tk ${available.toFixed(2)}.` };
  }

  const now = new Date();
  await db.vendorPayout.create({
    data: {
      vendorId: user.vendorProfile.id,
      amount: parsed.data.amount,
      status: "PENDING",
      periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
      periodEnd: now,
    },
  });

  revalidatePath("/vendor/payouts");
  return { status: "success", message: "Payout requested. An admin will review it shortly." };
}
