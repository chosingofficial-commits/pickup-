import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { serverEnv } from "@/lib/env/server";
import { signSessionToken, verifySessionToken, SESSION_MAX_AGE, type SessionPayload } from "./jwt";

export async function createSession(payload: SessionPayload) {
  const token = await signSessionToken(payload);
  const store = await cookies();
  store.set(serverEnv.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: serverEnv.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(serverEnv.SESSION_COOKIE_NAME);
}

export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  const token = store.get(serverEnv.SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
});

/** Full, fresh user record for the signed-in session (or null). Cached per request. */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      role: true,
      name: true,
      email: true,
      phone: true,
      locale: true,
      avatarUrl: true,
      isActive: true,
      vendorProfile: { select: { id: true, businessType: true, isApproved: true, isSuspended: true } },
      riderProfile: { select: { id: true, isApproved: true } },
    },
  });
  if (!user || !user.isActive) return null;
  return user;
});
