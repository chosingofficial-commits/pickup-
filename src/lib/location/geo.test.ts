import { describe, it, expect } from "vitest";
import { isPointInPolygon, haversineDistanceKm } from "./geo";

describe("isPointInPolygon", () => {
  const square = [
    { lat: 23.123, lng: 91.978 },
    { lat: 23.123, lng: 91.982 },
    { lat: 23.119, lng: 91.982 },
    { lat: 23.119, lng: 91.978 },
  ];

  it("detects a point inside the polygon", () => {
    expect(isPointInPolygon({ lat: 23.121, lng: 91.98 }, square)).toBe(true);
  });

  it("detects a point outside the polygon", () => {
    expect(isPointInPolygon({ lat: 23.2, lng: 92.1 }, square)).toBe(false);
  });

  it("returns false for a degenerate polygon with fewer than 3 points", () => {
    expect(isPointInPolygon({ lat: 23.121, lng: 91.98 }, [square[0]!, square[1]!])).toBe(false);
  });
});

describe("haversineDistanceKm", () => {
  it("returns 0 for identical points", () => {
    const point = { lat: 23.1206, lng: 91.9853 };
    expect(haversineDistanceKm(point, point)).toBeCloseTo(0, 5);
  });

  it("returns a positive, plausible distance for two nearby points", () => {
    // Khagrachari town centre vs. Shapla Chattar — roughly 300-500m apart in seed data.
    const a = { lat: 23.1206, lng: 91.9853 };
    const b = { lat: 23.118, lng: 91.987 };
    const distance = haversineDistanceKm(a, b);
    expect(distance).toBeGreaterThan(0.1);
    expect(distance).toBeLessThan(1);
  });
});
