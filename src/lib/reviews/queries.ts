import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

export const getFeaturedReviews = unstable_cache(
  async (limit = 6) => {
    return db.review.findMany({
      where: { rating: { gte: 4 } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        customer: { select: { name: true } },
        product: { select: { name: true } },
        vendor: { select: { businessName: true } },
      },
    });
  },
  ["featured-reviews"],
  { revalidate: 300, tags: ["reviews"] },
);
