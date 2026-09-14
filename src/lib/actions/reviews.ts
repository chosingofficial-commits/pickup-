"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import type { ActionState } from "./types";

const reviewSchema = z.object({
  orderId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function submitOrderReviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Please log in." };

  const parsed = reviewSchema.safeParse({
    orderId: formData.get("orderId"),
    rating: formData.get("rating"),
    comment: formData.get("comment"),
  });
  if (!parsed.success) return { status: "error", message: "Please choose a rating." };

  const order = await db.order.findUnique({ where: { id: parsed.data.orderId } });
  if (!order || order.customerId !== user.id) return { status: "error", message: "Order not found." };
  if (order.status !== "DELIVERED") return { status: "error", message: "You can review an order once it's delivered." };

  const existing = await db.review.findFirst({ where: { orderId: order.id, customerId: user.id } });
  if (existing) return { status: "error", message: "You've already reviewed this order." };

  await db.review.create({
    data: {
      customerId: user.id,
      orderId: order.id,
      vendorId: order.vendorId,
      rating: parsed.data.rating,
      comment: parsed.data.comment || null,
    },
  });

  const agg = await db.review.aggregate({ where: { vendorId: order.vendorId }, _avg: { rating: true }, _count: true });
  await db.vendor.update({
    where: { id: order.vendorId },
    data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count },
  });

  revalidatePath(`/account/orders/${order.id}`);
  revalidatePath("/account/reviews");
  return { status: "success", message: "Thanks for your review!" };
}
