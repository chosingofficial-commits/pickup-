"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { optionalText } from "@/lib/validation/form-helpers";
import type { ActionState } from "./types";

const ratingSchema = z.object({
  orderId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: optionalText(z.string().trim().max(1000)),
});

/**
 * Server-side checks, enforced independently of whatever the UI already
 * hid: only the order's own customer, only once per delivery (also backed
 * by RiderRating.orderId's DB-level unique constraint), only once the
 * order has actually been DELIVERED.
 */
export async function submitRiderRatingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Please log in." };

  const parsed = ratingSchema.safeParse({
    orderId: formData.get("orderId"),
    rating: formData.get("rating"),
    comment: formData.get("comment"),
  });
  if (!parsed.success) return { status: "error", message: "Please choose a rating." };

  const order = await db.order.findUnique({
    where: { id: parsed.data.orderId },
    include: { delivery: { select: { riderId: true } } },
  });
  if (!order || order.customerId !== user.id) return { status: "error", message: "Order not found." };
  if (order.status !== "DELIVERED") return { status: "error", message: "You can rate your rider once the order is delivered." };
  if (!order.delivery?.riderId) return { status: "error", message: "No rider was assigned to this order." };

  const existing = await db.riderRating.findUnique({ where: { orderId: order.id } });
  if (existing) return { status: "error", message: "You've already rated this delivery." };

  const riderId = order.delivery.riderId;

  try {
    await db.$transaction(async (tx) => {
      await tx.riderRating.create({
        data: {
          orderId: order.id,
          customerId: user.id,
          riderId,
          rating: parsed.data.rating,
          comment: parsed.data.comment || null,
        },
      });
      const agg = await tx.riderRating.aggregate({ where: { riderId }, _avg: { rating: true }, _count: true });
      await tx.riderProfile.update({
        where: { id: riderId },
        data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count },
      });
    });
  } catch {
    // Unique-constraint race: two submissions for the same order landed
    // concurrently — the loser gets a friendly message instead of a crash.
    return { status: "error", message: "You've already rated this delivery." };
  }

  revalidatePath(`/account/orders/${order.id}`);
  revalidatePath("/rider/ratings");
  revalidatePath("/rider");
  return { status: "success", message: "Thanks for rating your rider!" };
}
