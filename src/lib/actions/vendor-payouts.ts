"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createVendorPayoutRequest } from "@/lib/vendor/payout-request";
import type { ActionState } from "./types";

// A regex (not z.coerce.number + multipleOf) so "max 2 decimals" can't be
// fooled by binary floating-point representation — e.g. 0.1 isn't exactly
// representable, so a multipleOf(0.01) check on the coerced number can
// reject a perfectly valid amount depending on rounding.
const payoutSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount with at most 2 decimal places")
    .transform(Number)
    .refine((n) => n > 0 && Number.isFinite(n), "Enter a valid amount"),
});

export async function requestPayoutAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user?.vendorProfile) return { status: "error", message: "Please log in." };

  const parsed = payoutSchema.safeParse({ amount: String(formData.get("amount") ?? "") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Enter a valid amount." };

  // The real protection is here, inside a locked transaction — the UI's own
  // `max` attribute and disabled state are just convenience, never trusted.
  const result = await createVendorPayoutRequest(user.vendorProfile.id, parsed.data.amount);
  if (!result.ok) {
    return { status: "error", message: `You can request up to Tk ${Math.max(0, result.available).toFixed(2)}.` };
  }

  revalidatePath("/vendor/payouts");
  return { status: "success", message: "Payout requested. An admin will review it shortly." };
}
