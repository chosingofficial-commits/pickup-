"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export async function toggleRiderOnlineAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.riderProfile) return;
  const isOnline = formData.get("isOnline") === "1";
  await db.riderProfile.update({ where: { id: user.riderProfile.id }, data: { isOnline } });
  revalidatePath("/rider");
}
