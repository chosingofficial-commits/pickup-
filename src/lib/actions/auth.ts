"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { roleHome } from "@/lib/auth/role-home";
import { safeNextPath } from "@/lib/auth/safe-redirect";
import { loginSchema, registerSchema } from "@/lib/validation/auth";
import { loginRateLimiter, registrationRateLimiter } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/request";
import { recordAuditLog } from "@/lib/audit";
import type { ActionState } from "./types";

function flattenFieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  const flat = error.flatten().fieldErrors;
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(flat)) {
    if (value) out[key] = value;
  }
  return out;
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await getClientIp();
  const allowed = await loginRateLimiter.consume(ip);
  if (!allowed) {
    return { status: "error", message: "Too many login attempts. Please try again in a few minutes." };
  }

  const parsed = loginSchema.safeParse({
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: flattenFieldErrors(parsed.error) };
  }

  const user = await db.user.findUnique({ where: { phone: parsed.data.phone } });
  // Constant response shape whether the phone exists or not — avoids leaking account existence.
  const isValid = user && user.isActive ? await verifyPassword(parsed.data.password, user.passwordHash) : false;

  if (!user || !isValid) {
    return { status: "error", message: "Incorrect phone number or password." };
  }

  await createSession({ sub: user.id, role: user.role, name: user.name });
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  redirect(safeNextPath(String(formData.get("next") ?? "")) ?? roleHome(user.role));
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await getClientIp();
  const allowed = await registrationRateLimiter.consume(ip);
  if (!allowed) {
    return { status: "error", message: "Too many attempts. Please try again later." };
  }

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: flattenFieldErrors(parsed.error) };
  }

  const { name, phone, email, password } = parsed.data;
  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await db.user.create({
      data: {
        name,
        phone,
        email: email ? email : null,
        passwordHash,
        role: "CUSTOMER",
        customerProfile: { create: {} },
        cart: { create: {} },
        wishlist: { create: {} },
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { status: "error", message: "An account with this phone or email already exists." };
    }
    throw err;
  }

  await recordAuditLog({ actorUserId: user.id, action: "USER_REGISTERED", entityType: "User", entityId: user.id });
  await createSession({ sub: user.id, role: user.role, name: user.name });
  redirect(safeNextPath(String(formData.get("next") ?? "")) ?? roleHome(user.role));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
