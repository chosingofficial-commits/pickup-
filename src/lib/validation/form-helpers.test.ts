import { describe, it, expect } from "vitest";
import { z } from "zod";
import { optionalText, optionalNumber } from "./form-helpers";
import { productSchema } from "./product";
import { addressSchema } from "./address";
import { registerSchema } from "./auth";
import { supportTicketSchema } from "./support";
import { coverageRequestSchema } from "./location";
import { couponSchema } from "./coupon";

/**
 * Regression coverage for the bug class behind the silent "Add item" failure
 * (see menu-item.test.ts): `.optional().or(z.literal(""))` only tolerates
 * `undefined`, not the `null` FormData.get() returns for a field a form
 * doesn't render at all. Every schema below was migrated off that pattern
 * onto these two shared helpers — this file locks in that both helpers, and
 * every migrated schema, actually accept `null`.
 */
describe("optionalText / optionalNumber", () => {
  it("optionalText treats null, '', and undefined as absent", () => {
    const schema = z.object({ note: optionalText(z.string().trim().max(10)) });
    expect(schema.safeParse({ note: null }).success).toBe(true);
    expect(schema.safeParse({ note: "" }).success).toBe(true);
    expect(schema.safeParse({ note: undefined }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(true);
  });

  it("optionalText still validates a present value", () => {
    const schema = z.object({ note: optionalText(z.string().trim().max(5)) });
    expect(schema.safeParse({ note: "way too long" }).success).toBe(false);
    const ok = schema.safeParse({ note: "hi" });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.note).toBe("hi");
  });

  it("optionalNumber treats null and '' as absent, for both a plain and a coerced number", () => {
    const plain = z.object({ n: optionalNumber(z.number().positive()) });
    expect(plain.safeParse({ n: null }).success).toBe(true);
    expect(plain.safeParse({ n: "" }).success).toBe(true);

    const coerced = z.object({ n: optionalNumber(z.coerce.number().positive()) });
    expect(coerced.safeParse({ n: null }).success).toBe(true);
    expect(coerced.safeParse({ n: "" }).success).toBe(true);
    const ok = coerced.safeParse({ n: "12.5" });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.n).toBe(12.5);
  });
});

describe("schemas migrated off .optional().or(z.literal(\"\")) — every optional field absent as null", () => {
  it("productSchema (description, sku)", () => {
    const result = productSchema.safeParse({ name: "Rice 1kg", categoryId: "cat-1", description: null, sku: null, isWeeklyGrocery: false });
    expect(result.success).toBe(true);
  });

  it("addressSchema (landmark)", () => {
    const result = addressSchema.safeParse({
      label: "Home",
      recipientName: "Jane Doe",
      recipientPhone: "01712345678",
      neighbourhoodId: "n-1",
      streetOrVillage: "123 Main Rd",
      landmark: null,
    });
    expect(result.success).toBe(true);
  });

  it("registerSchema (email)", () => {
    const result = registerSchema.safeParse({
      name: "Jane Doe",
      phone: "01712345678",
      email: null,
      password: "password123",
      confirmPassword: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("supportTicketSchema (phone)", () => {
    const result = supportTicketSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: null,
      subject: "Order issue",
      category: "orders",
      message: "My order hasn't arrived yet and it's been three days.",
    });
    expect(result.success).toBe(true);
  });

  it("coverageRequestSchema (lat, lng, divisionText, districtText, upazilaText)", () => {
    const result = coverageRequestSchema.safeParse({
      name: "Jane Doe",
      phone: "01712345678",
      addressText: "Somewhere in town",
      lat: null,
      lng: null,
      divisionText: null,
      districtText: null,
      upazilaText: null,
    });
    expect(result.success).toBe(true);
  });

  it("couponSchema (maxDiscountAmount, usageLimit)", () => {
    const result = couponSchema.safeParse({
      code: "SAVE10",
      type: "PERCENTAGE",
      value: 10,
      minOrderAmount: 0,
      maxDiscountAmount: null,
      startsAt: "2026-01-01",
      endsAt: "2026-12-31",
      usageLimit: null,
      perCustomerLimit: 1,
    });
    expect(result.success).toBe(true);
  });
});
