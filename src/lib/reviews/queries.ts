import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

export const getFeaturedReviews = cache(async (limit = 6) => {
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
});
