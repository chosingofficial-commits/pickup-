"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { submitOrderReviewAction } from "@/lib/actions/reviews";
import { initialActionState } from "@/lib/actions/types";
import { Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";

export function OrderReviewForm({ orderId }: { orderId: string }) {
  const [state, formAction] = useActionState(submitOrderReviewAction, initialActionState);
  const [rating, setRating] = useState(0);

  if (state.status === "success") {
    return (
      <p role="status" className="rounded-control bg-brand-bg px-3.5 py-2.5 text-sm text-brand-dark">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="rating" value={rating} />
      <div>
        <p className="mb-1 text-sm font-semibold text-brand-dark">Rate your order</p>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onClick={() => setRating(n)}
            >
              <Star className={`h-7 w-7 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} aria-hidden />
            </button>
          ))}
        </div>
      </div>
      <Textarea name="comment" rows={3} placeholder="Tell others about your experience (optional)" />
      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}
      <SubmitButton className="w-auto px-6" disabled={rating === 0}>
        Submit review
      </SubmitButton>
    </form>
  );
}
