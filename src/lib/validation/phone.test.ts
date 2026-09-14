import { describe, it, expect } from "vitest";
import { bdPhoneSchema, normalizeBdPhone } from "./phone";

describe("bdPhoneSchema", () => {
  it("accepts a local-format Bangladeshi mobile number", () => {
    const result = bdPhoneSchema.safeParse("01712345678");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("+8801712345678");
  });

  it("accepts numbers already prefixed with +88 or 88", () => {
    expect(bdPhoneSchema.safeParse("+8801812345678").success).toBe(true);
    expect(bdPhoneSchema.safeParse("8801912345678").success).toBe(true);
  });

  it("rejects numbers that are too short", () => {
    expect(bdPhoneSchema.safeParse("017123").success).toBe(false);
  });

  it("rejects numbers with an invalid operator digit", () => {
    // Valid operator digits are 3-9; "01212345678" uses "2".
    expect(bdPhoneSchema.safeParse("01212345678").success).toBe(false);
  });

  it("rejects non-Bangladeshi numbers", () => {
    expect(bdPhoneSchema.safeParse("+14155552671").success).toBe(false);
  });
});

describe("normalizeBdPhone", () => {
  it("normalizes local and international formats to the same +88 form", () => {
    expect(normalizeBdPhone("01712345678")).toBe("+8801712345678");
    expect(normalizeBdPhone("+8801712345678")).toBe("+8801712345678");
    expect(normalizeBdPhone("8801712345678")).toBe("+8801712345678");
  });
});
