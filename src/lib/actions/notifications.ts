"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  const notification = await db.notification.findUnique({ where: { id } });
  if (notification && notification.userId === user.id) {
    await db.notification.update({ where: { id }, data: { isRead: true } });
    // Shown on three different pages (customer account, vendor dashboard,
    // rider dashboard) — revalidate all three rather than guessing which
    // one the caller came from.
    revalidatePath("/account/notifications");
    revalidatePath("/vendor/notifications");
    revalidatePath("/rider/notifications");
  }
}
