"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { riderApplicationSchema } from "@/lib/validation/rider-application";
import { riderRegistrationRateLimiter } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/request";
import { recordAuditLog } from "@/lib/audit";
import { getStorageAdapter } from "@/lib/storage/registry";
import { ALLOWED_UPLOAD_TYPES } from "@/lib/storage/types";
import { matchesDeclaredType } from "@/lib/storage/magic-bytes";
import type { ActionState } from "./types";

const MAX_NID_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB — phone photos of NIDs are typically 2-5MB.

export async function registerRiderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await getClientIp();
  if (!(await riderRegistrationRateLimiter.consume(ip))) {
    return { status: "error", message: "Too many attempts. Please try again in an hour." };
  }

  const parsed = riderApplicationSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    vehicleType: formData.get("vehicleType"),
    nationalIdNo: formData.get("nationalIdNo"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed.error.flatten().fieldErrors)) if (value) fieldErrors[key] = value;
    return { status: "error", message: "Please fix the errors below.", fieldErrors };
  }

  const nidPhoto = formData.get("nationalIdDoc");
  if (!(nidPhoto instanceof File) || nidPhoto.size === 0) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: { nationalIdDoc: ["Upload your National ID photo"] } };
  }
  if (nidPhoto.size > MAX_NID_PHOTO_BYTES) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: { nationalIdDoc: ["Photo must be under 5MB"] } };
  }
  if (!ALLOWED_UPLOAD_TYPES.includes(nidPhoto.type as (typeof ALLOWED_UPLOAD_TYPES)[number])) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: { nationalIdDoc: ["Use JPEG, PNG, WebP, or PDF"] } };
  }

  // All field + duplicate-phone validation happens before the upload, so a
  // rejected submission never leaves an orphaned file in the private bucket.
  const existing = await db.user.findUnique({ where: { phone: parsed.data.phone } });
  if (existing) {
    return { status: "error", message: "An account with this phone number already exists." };
  }

  const buffer = Buffer.from(await nidPhoto.arrayBuffer());
  if (!matchesDeclaredType(buffer, nidPhoto.type)) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: { nationalIdDoc: ["File content doesn't match its declared type"] } };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const adapter = getStorageAdapter();
  // Not tied to a user id — the account doesn't exist yet at this point (rider
  // registration is a single-step signup, unlike the vendor flow where an
  // already-logged-in user uploads first). The key is generated and stored by
  // this same trusted server action end-to-end, so there's no client-supplied
  // key to validate ownership of afterward.
  const uploadResult = await adapter.upload(
    { buffer, filename: nidPhoto.name, contentType: nidPhoto.type },
    `rider-documents/${randomUUID()}`,
    { private: true },
  );

  let user;
  try {
    user = await db.user.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        passwordHash,
        role: "RIDER",
        riderProfile: {
          create: {
            isApproved: false,
            vehicleType: parsed.data.vehicleType,
            nationalIdNo: parsed.data.nationalIdNo,
            nationalIdDocKey: uploadResult.key,
          },
        },
      },
    });
  } catch (err) {
    // Best-effort cleanup — e.g. a race against a duplicate phone number that
    // slipped past the pre-check above. Never let a rejected registration
    // leave an orphaned file in the private bucket.
    await adapter.delete(uploadResult.key, { private: true }).catch(() => {});
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { status: "error", message: "An account with this phone number already exists." };
    }
    throw err;
  }

  // Never include nationalIdNo (or any other NID detail) in audit log metadata.
  await recordAuditLog({ actorUserId: user.id, action: "RIDER_REGISTERED", entityType: "User", entityId: user.id });
  await createSession({ sub: user.id, role: user.role, name: user.name });
  redirect("/rider");
}
