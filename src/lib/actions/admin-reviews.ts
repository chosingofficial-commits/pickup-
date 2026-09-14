"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/rbac";
import { recordAuditLog } from "@/lib/audit";

export async function deleteReviewAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const reviewId = String(formData.get("reviewId") ?? "");
  const review = await db.review.findUnique({ where: { id: reviewId } });
  if (!review) return;

  await db.review.delete({ where: { id: reviewId } });

  if (review.vendorId) {
    const agg = await db.review.aggregate({ where: { vendorId: review.vendorId }, _avg: { rating: true }, _count: true });
    await db.vendor.update({ where: { id: review.vendorId }, data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count } });
  }
  if (review.productId) {
    const agg = await db.review.aggregate({ where: { productId: review.productId }, _avg: { rating: true }, _count: true });
    await db.product.update({ where: { id: review.productId }, data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count } });
  }

  await recordAuditLog({ actorUserId: admin.id, action: "REVIEW_DELETED", entityType: "Review", entityId: reviewId });
  revalidatePath("/admin/reviews");
}
