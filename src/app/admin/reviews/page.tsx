import type { Metadata } from "next";
import { Star } from "lucide-react";
import { deleteReviewAction } from "@/lib/actions/admin-reviews";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Reviews" };

export default async function AdminReviewsPage() {
  const reviews = await db.review.findMany({
    include: { customer: { select: { name: true } }, product: { select: { name: true } }, vendor: { select: { businessName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Reviews</h1>
      <div className="space-y-2">
        {reviews.map((review) => (
          <div key={review.id} className="flex items-start justify-between gap-3 rounded-card border border-border-brand bg-white p-4">
            <div>
              <div className="flex items-center gap-0.5" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {review.customer.name} · {review.product?.name ?? review.vendor?.businessName}
              </p>
              {review.comment && <p className="mt-1 text-sm text-gray-700">{review.comment}</p>}
            </div>
            <form action={deleteReviewAction}>
              <input type="hidden" name="reviewId" value={review.id} />
              <button type="submit" className="rounded-control border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                Remove
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
