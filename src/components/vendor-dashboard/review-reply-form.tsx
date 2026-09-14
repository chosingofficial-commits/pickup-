"use client";

import { useActionState } from "react";
import { replyToReviewAction } from "@/lib/actions/vendor-reviews";
import { initialActionState } from "@/lib/actions/types";

export function ReviewReplyForm({ reviewId }: { reviewId: string }) {
  const [state, formAction, pending] = useActionState(replyToReviewAction, initialActionState);

  if (state.status === "success") return <p className="text-xs text-brand-primary">Reply posted.</p>;

  return (
    <form action={formAction} className="mt-2 flex gap-2">
      <input type="hidden" name="reviewId" value={reviewId} />
      <input name="reply" placeholder="Write a reply…" className="h-9 flex-1 rounded-control border border-border-brand px-3 text-xs" />
      <button type="submit" disabled={pending} className="rounded-control bg-brand-primary px-3 text-xs font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60">
        Reply
      </button>
    </form>
  );
}
