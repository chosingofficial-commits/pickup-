import { Star } from "lucide-react";
import type { getFeaturedReviews } from "@/lib/reviews/queries";

export function ReviewsSection({ reviews }: { reviews: Awaited<ReturnType<typeof getFeaturedReviews>> }) {
  if (reviews.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-card border border-border-brand bg-white p-4 shadow-soft">
          <div className="flex items-center gap-0.5" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-4 w-4 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
            ))}
          </div>
          {review.comment && <p className="mt-2 text-sm text-gray-700">&ldquo;{review.comment}&rdquo;</p>}
          <p className="mt-3 text-xs font-semibold text-brand-dark">{review.customer.name}</p>
          <p className="text-xs text-gray-500">{review.product?.name ?? review.vendor?.businessName}</p>
        </div>
      ))}
    </div>
  );
}
