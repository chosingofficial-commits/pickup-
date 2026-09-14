import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { serverEnv } from "@/lib/env/server";
import type { UserRole } from "@/generated/prisma/client";

export type SessionPayload = {
  sub: string;
  role: UserRole;
  name: string;
};

const secretKey = new TextEncoder().encode(serverEnv.AUTH_SECRET);
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (typeof payload.sub !== "string" || typeof payload.role !== "string" || typeof payload.name !== "string") {
      return null;
    }
    return { sub: payload.sub, role: payload.role as UserRole, name: payload.name };
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_DURATION_SECONDS;
