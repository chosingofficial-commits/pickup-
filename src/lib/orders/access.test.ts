import { describe, it, expect } from "vitest";
import { canViewOrderGroup } from "./access";

// Regression coverage for a production report: a VENDOR test account
// ("test1") landed on a 404 at /checkout/confirmation/<id>. Investigation
// showed that specific order belonged to a different, unrelated customer
// (the 404 was the ownership check correctly protecting someone else's
// order) — but the underlying question still needed a real answer: can a
// vendor/rider account view the confirmation of an order *they themselves*
// placed? These tests prove the check is role-agnostic by construction.
describe("canViewOrderGroup", () => {
  it("allows the owning customer", () => {
    expect(canViewOrderGroup({ customerId: "user-1" }, { id: "user-1" })).toBe(true);
  });

  it("denies a different user", () => {
    expect(canViewOrderGroup({ customerId: "user-1" }, { id: "user-2" })).toBe(false);
  });

  it("allows a VENDOR-role account to view an order group it placed itself", () => {
    // The User row is the same regardless of role — a vendor's own
    // dashboard access is a separate relation (vendorProfile), never a
    // precondition for viewing an order they placed as a customer.
    expect(canViewOrderGroup({ customerId: "vendor-user-1" }, { id: "vendor-user-1" })).toBe(true);
  });

  it("allows a RIDER-role account to view an order group it placed itself", () => {
    expect(canViewOrderGroup({ customerId: "rider-user-1" }, { id: "rider-user-1" })).toBe(true);
  });

  it("denies when there's no order group", () => {
    expect(canViewOrderGroup(null, { id: "user-1" })).toBe(false);
  });

  it("denies when there's no logged-in user", () => {
    expect(canViewOrderGroup({ customerId: "user-1" }, null)).toBe(false);
  });
});
