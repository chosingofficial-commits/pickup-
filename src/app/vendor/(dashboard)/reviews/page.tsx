import type { Metadata } from "next";
import { Star } from "lucide-react";
import { ReviewReplyForm } from "@/components/vendor-dashboard/review-reply-form";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Reviews" };

export default async function VendorReviewsPage() {
  const user = await getCurrentUser();
  if (!user?.vendorProfile) return null;

  const reviews = await db.review.findMany({
    where: { vendorId: user.vendorProfile.id },
    include: { customer: { select: { name: true } }, product: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Reviews</h1>
      {reviews.length === 0 ? (
        <p className="text-sm text-gray-500">No reviews yet.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-card border border-border-brand bg-white p-4">
              <div className="flex items-center gap-0.5" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {review.customer.name} {review.product && `· ${review.product.name}`}
              </p>
              {review.comment && <p className="mt-1 text-sm text-gray-700">{review.comment}</p>}
              {review.vendorReply ? (
                <p className="mt-2 rounded-control bg-brand-bg px-3 py-2 text-xs text-brand-dark">
                  <span className="font-semibold">Your reply: </span>
                  {review.vendorReply}
                </p>
              ) : (
                <ReviewReplyForm reviewId={review.id} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
