import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";
import type { UserRole } from "@/generated/prisma/client";

export async function requireUser(redirectTo = "/login") {
  const user = await getCurrentUser();
  if (!user) redirect(`${redirectTo}?next=${encodeURIComponent(redirectTo)}`);
  return user;
}

export async function requireRole(roles: UserRole[], redirectTo = "/login") {
  const user = await getCurrentUser();
  if (!user) redirect(redirectTo);
  if (!roles.includes(user.role)) redirect("/");
  return user;
}

export async function requireApprovedVendor() {
  const user = await requireRole(["VENDOR"], "/login");
  if (!user.vendorProfile || user.vendorProfile.isSuspended) {
    redirect("/vendor/suspended");
  }
  return user;
}

export async function requireAdmin() {
  return requireRole(["ADMIN"], "/login");
}
