import { describe, it, expect } from "vitest";
import { formatBDT, slugify, cn, titleCase } from "./utils";

describe("formatBDT", () => {
  it("formats a whole number without decimals", () => {
    expect(formatBDT(500)).toBe("Tk 500");
  });

  it("formats a fractional amount with two decimals", () => {
    expect(formatBDT(199.5)).toBe("Tk 199.50");
  });

  it("accepts a numeric string", () => {
    expect(formatBDT("650")).toBe("Tk 650");
  });

  it("accepts a Prisma Decimal-like object with toString()", () => {
    const decimalLike = { toString: () => "1234.56" };
    expect(formatBDT(decimalLike)).toBe("Tk 1,234.56");
  });

  it("adds thousands separators", () => {
    expect(formatBDT(12000)).toBe("Tk 12,000");
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Basmati Rice 5kg")).toBe("basmati-rice-5kg");
  });

  it("strips punctuation", () => {
    expect(slugify("Mom's Kitchen & Bakery!")).toBe("moms-kitchen-bakery");
  });

  it("collapses repeated whitespace and hyphens", () => {
    expect(slugify("Too   Many   Spaces")).toBe("too-many-spaces");
  });
});

describe("titleCase", () => {
  // Regression coverage for a real production report: a service area's
  // name was entered as "khagrachari" and showed up lowercase in "Now
  // delivering in khagrachari" — place names are free-text admin entry and
  // can't be trusted to already be correctly cased.
  it("capitalizes a lowercase single word", () => {
    expect(titleCase("khagrachari")).toBe("Khagrachari");
  });

  it("capitalizes every word in a multi-word name", () => {
    expect(titleCase("khagrachari sadar")).toBe("Khagrachari Sadar");
  });

  it("normalizes an all-caps name instead of leaving it shouting", () => {
    expect(titleCase("KHAGRACHARI TOWN CENTRE")).toBe("Khagrachari Town Centre");
  });

  it("leaves an already-correct name unchanged", () => {
    expect(titleCase("Khagrachari Sadar")).toBe("Khagrachari Sadar");
  });
});

describe("cn", () => {
  it("merges class names and resolves Tailwind conflicts (last one wins)", () => {
    expect(cn("h-9 w-9", "h-12")).toBe("w-9 h-12");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });
});
