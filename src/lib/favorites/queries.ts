import "server-only";
import { db } from "@/lib/db";

export async function getFavoritedVendorIds(userId: string): Promise<Set<string>> {
  const rows = await db.favoriteVendor.findMany({ where: { userId }, select: { vendorId: true } });
  return new Set(rows.map((r) => r.vendorId));
}

export async function getFavoriteVendors(userId: string) {
  const favorites = await db.favoriteVendor.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { vendor: { include: { restaurant: { include: { weeklyHours: true } } } } },
  });
  return favorites.map((f) => f.vendor).filter((v) => v.deletedAt === null);
}
