// @vitest-environment node
import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { resolveLocation } from "./resolve";

/**
 * Integration tests against the seeded Khagrachari Sadar delivery zones
 * (see prisma/seed.ts) — verifies the point-in-polygon zone resolution
 * that gates checkout to the platform's active coverage.
 */
describe("resolveLocation", () => {
  it("resolves a point inside a seeded zone's boundary as covered", async () => {
    // Khagrachari Town Centre's seeded centre point, which sits inside its own boundary square.
    const result = await resolveLocation({ lat: 23.1206, lng: 91.9853 });
    expect(result.isCovered).toBe(true);
    if (result.isCovered) {
      expect(result.serviceAreaName).toBe("Khagrachari Sadar");
    }
  });

  it("treats a point far outside any coverage as not covered", async () => {
    // Central Dhaka — nowhere near Khagrachari Sadar.
    const result = await resolveLocation({ lat: 23.8103, lng: 90.4125 });
    expect(result.isCovered).toBe(false);
  });

  it("resolves an explicitly chosen neighbourhood to its delivery zone", async () => {
    const neighbourhood = await db.neighbourhood.findFirstOrThrow({ where: { slug: "khagrachari-town-centre" } });
    const result = await resolveLocation({ neighbourhoodId: neighbourhood.id });
    expect(result.isCovered).toBe(true);
  });

  it("is not covered when given neither coordinates nor a neighbourhood", async () => {
    const result = await resolveLocation({});
    expect(result.isCovered).toBe(false);
  });
});
