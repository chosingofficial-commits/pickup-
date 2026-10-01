import { describe, it, expect } from "vitest";
import { getRiderBalanceStatus } from "./balance";

describe("getRiderBalanceStatus", () => {
  it("is paidUp when the balance is exactly zero", () => {
    expect(getRiderBalanceStatus(0)).toBe("paidUp");
  });

  it("is owes when the rider owes the platform (positive balance)", () => {
    expect(getRiderBalanceStatus(20625)).toBe("owes");
  });

  it("is weOwe when the platform owes the rider (negative balance)", () => {
    expect(getRiderBalanceStatus(-500)).toBe("weOwe");
  });
});
