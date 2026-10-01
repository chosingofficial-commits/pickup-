import { describe, it, expect } from "vitest";
import { formatCollectedLabel } from "./ledger";

describe("formatCollectedLabel", () => {
  it("shows the full amount as 'Collected' for a COD delivery", () => {
    expect(formatCollectedLabel(true, 42000)).toBe("Collected: Tk 420");
  });

  // Regression test: an online-paid order's amountPoisha is the rider's
  // EARNING share, not cash in hand — the rider never collects anything for
  // it, so it must never be shown under a "Collected" label (the bug this
  // guards against showed the rider's Tk 22.50 earning as "Collected: Tk 22.50").
  it("shows 'Paid online' for a non-COD delivery, never the earning amount", () => {
    const result = formatCollectedLabel(false, 2250);
    expect(result).toBe("Paid online");
    expect(result).not.toContain("22.5");
    expect(result).not.toContain("Collected");
  });

  it("treats a null/undefined isCod (legacy entries predating the isCod snapshot) as not collected", () => {
    expect(formatCollectedLabel(null, 10000)).toBe("Paid online");
    expect(formatCollectedLabel(undefined, 10000)).toBe("Paid online");
  });
});
