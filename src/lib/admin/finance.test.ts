import { describe, it, expect } from "vitest";
import { describeOwedBalance } from "./finance";

// Regression coverage for explicit user feedback: a raw negative balance
// ("-22,896") read as a plain amount rather than a sign flip — this must
// always be spelled out in words instead.
describe("describeOwedBalance", () => {
  it("says Pick Up owes the party when the balance is positive", () => {
    expect(describeOwedBalance(500, "vendors")).toBe("Pick Up owes vendors Tk 500");
  });

  it("says the party owes Pick Up when the balance is negative, using the absolute amount", () => {
    expect(describeOwedBalance(-22896, "vendors")).toBe("Vendors owe Pick Up Tk 22,896");
  });

  it("never renders a negative number anywhere in the output", () => {
    expect(describeOwedBalance(-22896, "vendors")).not.toMatch(/-/);
  });

  it("reports exactly zero as settled, not as owed either way", () => {
    expect(describeOwedBalance(0, "riders")).toBe("All settled — Tk 0 owed either way");
  });

  it("treats a sub-poisha rounding residue as settled too", () => {
    expect(describeOwedBalance(0.004, "riders")).toBe("All settled — Tk 0 owed either way");
  });

  it("capitalizes the party label when it starts the sentence", () => {
    expect(describeOwedBalance(-10, "riders")).toBe("Riders owe Pick Up Tk 10");
  });
});
