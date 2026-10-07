import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { serverEnv } from "@/lib/env/server";

declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  // DATABASE_POOL_URL (a transaction-mode pooler, when configured) is what
  // every request goes through — DATABASE_URL itself is reserved for
  // `prisma migrate deploy`, which needs a session/direct connection. See
  // the comments on both in src/lib/env/server.ts.
  const adapter = new PrismaPg({ connectionString: serverEnv.DATABASE_POOL_URL ?? serverEnv.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db = globalThis.__prisma ?? createPrismaClient();

if (serverEnv.NODE_ENV !== "production") {
  globalThis.__prisma = db;
}
