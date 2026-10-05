"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { optionalText } from "@/lib/validation/form-helpers";
import type { ActionState } from "./types";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: optionalText(z.string().trim().email("Enter a valid email")),
});

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Please log in." };

  const parsed = profileSchema.safeParse({ name: formData.get("name"), email: formData.get("email") });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed.error.flatten().fieldErrors)) if (value) fieldErrors[key] = value;
    return { status: "error", message: "Please fix the errors below.", fieldErrors };
  }

  try {
    await db.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name, email: parsed.data.email || null },
    });
  } catch {
    return { status: "error", message: "Couldn't save changes. Please try again." };
  }

  revalidatePath("/account");
  return { status: "success", message: "Profile updated." };
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Please log in." };

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed.error.flatten().fieldErrors)) if (value) fieldErrors[key] = value;
    return { status: "error", message: "Please fix the errors below.", fieldErrors };
  }

  const fullUser = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  const isValid = await verifyPassword(parsed.data.currentPassword, fullUser.passwordHash);
  if (!isValid) return { status: "error", message: "Current password is incorrect." };

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db.user.update({ where: { id: user.id }, data: { passwordHash } });

  return { status: "success", message: "Password updated." };
}
