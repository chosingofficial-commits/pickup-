"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import type { ActionState } from "./types";

export async function replyToReviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user?.vendorProfile) return { status: "error", message: "Please log in." };

  const reviewId = String(formData.get("reviewId") ?? "");
  const reply = String(formData.get("reply") ?? "").trim();
  if (!reply) return { status: "error", message: "Enter a reply." };

  const review = await db.review.findUnique({ where: { id: reviewId } });
  if (!review || review.vendorId !== user.vendorProfile.id) return { status: "error", message: "Review not found." };

  await db.review.update({ where: { id: reviewId }, data: { vendorReply: reply } });
  revalidatePath("/vendor/reviews");
  return { status: "success" };
}
