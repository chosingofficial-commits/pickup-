import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

/** `client` defaults to the global db — pass a transaction client to write the log in the same transaction as the change it's recording. */
export async function recordAuditLog(
  entry: {
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  },
  client: Prisma.TransactionClient = db,
) {
  await client.auditLog.create({
    data: {
      actorUserId: entry.actorUserId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata ? JSON.parse(JSON.stringify(entry.metadata)) : undefined,
    },
  });
}
