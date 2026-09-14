"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { bdPhoneSchema } from "@/lib/validation/phone";
import { registrationRateLimiter } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/request";
import { recordAuditLog } from "@/lib/audit";
import { z } from "zod";
import type { ActionState } from "./types";

const riderSignupSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(80),
    phone: bdPhoneSchema,
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

export async function registerRiderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await getClientIp();
  if (!(await registrationRateLimiter.consume(ip))) {
    return { status: "error", message: "Too many attempts. Please try again later." };
  }

  const parsed = riderSignupSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed.error.flatten().fieldErrors)) if (value) fieldErrors[key] = value;
    return { status: "error", message: "Please fix the errors below.", fieldErrors };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  let user;
  try {
    user = await db.user.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        passwordHash,
        role: "RIDER",
        riderProfile: { create: { isApproved: false } },
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { status: "error", message: "An account with this phone number already exists." };
    }
    throw err;
  }

  await recordAuditLog({ actorUserId: user.id, action: "RIDER_REGISTERED", entityType: "User", entityId: user.id });
  await createSession({ sub: user.id, role: user.role, name: user.name });
  redirect("/rider");
}
