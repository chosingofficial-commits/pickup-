"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import type { ActionState } from "./types";

export async function toggleFavoriteVendorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const vendorId = String(formData.get("vendorId") ?? "");
  const redirectPath = String(formData.get("redirectPath") ?? "/restaurants");

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(redirectPath)}`);

  const existing = await db.favoriteVendor.findUnique({ where: { userId_vendorId: { userId: user.id, vendorId } } });

  if (existing) {
    await db.favoriteVendor.delete({ where: { id: existing.id } });
  } else {
    await db.favoriteVendor.create({ data: { userId: user.id, vendorId } });
  }

  revalidatePath(redirectPath);
  revalidatePath("/account/favorites");
  return { status: "success" };
}
