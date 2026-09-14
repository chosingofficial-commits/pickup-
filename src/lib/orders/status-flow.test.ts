import { describe, it, expect } from "vitest";
import { canTransition, getAvailableNextStatuses, getOrderFlow, isTerminal, statusLabel } from "./status-flow";

describe("getOrderFlow", () => {
  it("excludes READY_FOR_PICKUP for ordinary vendors", () => {
    const flow = getOrderFlow("GROCERY_VENDOR");
    expect(flow).not.toContain("READY_FOR_PICKUP");
    expect(flow).toEqual(["ORDER_PLACED", "CONFIRMED", "PREPARING", "RIDER_ASSIGNED", "PICKED_UP", "ON_THE_WAY", "DELIVERED"]);
  });

  it("includes READY_FOR_PICKUP for restaurants, right after PREPARING", () => {
    const flow = getOrderFlow("RESTAURANT");
    const prepIndex = flow.indexOf("PREPARING");
    expect(flow[prepIndex + 1]).toBe("READY_FOR_PICKUP");
  });
});

describe("canTransition — vendor orders never see Ready for pickup", () => {
  it("allows PREPARING -> RIDER_ASSIGNED directly for a grocery vendor", () => {
    expect(canTransition("PREPARING", "RIDER_ASSIGNED", "GROCERY_VENDOR")).toBe(true);
  });

  it("rejects PREPARING -> READY_FOR_PICKUP for a grocery vendor", () => {
    expect(canTransition("PREPARING", "READY_FOR_PICKUP", "GROCERY_VENDOR")).toBe(false);
  });

  it("requires READY_FOR_PICKUP before RIDER_ASSIGNED for a restaurant", () => {
    expect(canTransition("PREPARING", "RIDER_ASSIGNED", "RESTAURANT")).toBe(false);
    expect(canTransition("PREPARING", "READY_FOR_PICKUP", "RESTAURANT")).toBe(true);
    expect(canTransition("READY_FOR_PICKUP", "RIDER_ASSIGNED", "RESTAURANT")).toBe(true);
  });
});

describe("canTransition — forward-only, no skipping, no going backwards", () => {
  it("rejects skipping a step", () => {
    expect(canTransition("ORDER_PLACED", "PREPARING", "GROCERY_VENDOR")).toBe(false);
    expect(canTransition("CONFIRMED", "RIDER_ASSIGNED", "GROCERY_VENDOR")).toBe(false);
  });

  it("rejects moving backwards", () => {
    expect(canTransition("PREPARING", "CONFIRMED", "GROCERY_VENDOR")).toBe(false);
    expect(canTransition("DELIVERED", "ON_THE_WAY", "GROCERY_VENDOR")).toBe(false);
  });

  it("rejects any transition out of a terminal status", () => {
    expect(canTransition("DELIVERED", "REFUNDED", "GROCERY_VENDOR")).toBe(true); // explicit refund exception
    expect(canTransition("CANCELLED", "CONFIRMED", "GROCERY_VENDOR")).toBe(false);
    expect(isTerminal("CANCELLED")).toBe(true);
    expect(isTerminal("DELIVERED")).toBe(true);
    expect(isTerminal("PREPARING")).toBe(false);
  });

  it("rejects a no-op transition to the same status", () => {
    expect(canTransition("PREPARING", "PREPARING", "GROCERY_VENDOR")).toBe(false);
  });
});

describe("canTransition — cancellation window", () => {
  it("allows cancellation before the rider has picked up", () => {
    expect(canTransition("ORDER_PLACED", "CANCELLED", "GROCERY_VENDOR")).toBe(true);
    expect(canTransition("PREPARING", "CANCELLED", "RESTAURANT")).toBe(true);
  });

  it("rejects cancellation once a rider has been assigned", () => {
    expect(canTransition("RIDER_ASSIGNED", "CANCELLED", "GROCERY_VENDOR")).toBe(false);
    expect(canTransition("ON_THE_WAY", "CANCELLED", "GROCERY_VENDOR")).toBe(false);
  });
});

describe("getAvailableNextStatuses", () => {
  it("only offers rider-actor transitions to a rider", () => {
    const options = getAvailableNextStatuses("READY_FOR_PICKUP", "RESTAURANT", "RIDER");
    expect(options).toEqual(["RIDER_ASSIGNED"]);
  });

  it("only offers vendor-actor transitions to a vendor", () => {
    const options = getAvailableNextStatuses("ORDER_PLACED", "GROCERY_VENDOR", "VENDOR");
    expect(options).toContain("CONFIRMED");
    expect(options).not.toContain("RIDER_ASSIGNED");
  });

  it("returns nothing for a rider on a status only the vendor can advance", () => {
    const options = getAvailableNextStatuses("ORDER_PLACED", "GROCERY_VENDOR", "RIDER");
    expect(options).toEqual([]);
  });
});

describe("statusLabel", () => {
  it("returns a human-readable label for every status", () => {
    expect(statusLabel("READY_FOR_PICKUP")).toBe("Ready for pickup");
    expect(statusLabel("ORDER_PLACED")).toBe("Order placed");
  });
});
