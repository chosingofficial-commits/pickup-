import { describe, it, expect } from "vitest";
import { lineTotal, groupSubtotal, computeCouponDiscount, freeDeliveryApplies, getFreeDeliveryReason, computeVatAmount, round2 } from "./totals";

describe("lineTotal", () => {
  it("multiplies (unit price + add-ons) by quantity", () => {
    expect(lineTotal({ unitPrice: 100, quantity: 2, addOnsTotal: 0 })).toBe(200);
    expect(lineTotal({ unitPrice: 100, quantity: 2, addOnsTotal: 15 })).toBe(230);
  });
});

describe("groupSubtotal", () => {
  it("sums line totals across multiple lines", () => {
    const subtotal = groupSubtotal([
      { unitPrice: 650, quantity: 1, addOnsTotal: 0 },
      { unitPrice: 140, quantity: 2, addOnsTotal: 0 },
    ]);
    expect(subtotal).toBe(930);
  });

  it("returns 0 for an empty cart", () => {
    expect(groupSubtotal([])).toBe(0);
  });
});

describe("computeCouponDiscount", () => {
  it("returns 0 when there is no coupon", () => {
    expect(computeCouponDiscount(1000, null)).toBe(0);
  });

  it("returns 0 when the subtotal is below the coupon's minimum order amount", () => {
    const discount = computeCouponDiscount(200, { type: "FIXED", value: 50, minOrderAmount: 300 });
    expect(discount).toBe(0);
  });

  it("applies a fixed discount once the minimum is met", () => {
    const discount = computeCouponDiscount(500, { type: "FIXED", value: 50, minOrderAmount: 300 });
    expect(discount).toBe(50);
  });

  it("applies a percentage discount", () => {
    const discount = computeCouponDiscount(1000, { type: "PERCENTAGE", value: 10, minOrderAmount: 0 });
    expect(discount).toBe(100);
  });

  it("caps a percentage discount at maxDiscountAmount", () => {
    const discount = computeCouponDiscount(2000, { type: "PERCENTAGE", value: 10, minOrderAmount: 0, maxDiscountAmount: 100 });
    expect(discount).toBe(100);
  });

  it("never discounts more than the subtotal itself", () => {
    const discount = computeCouponDiscount(30, { type: "FIXED", value: 50, minOrderAmount: 0 });
    expect(discount).toBe(30);
  });
});

describe("freeDeliveryApplies", () => {
  const off = { enabled: false, minOrderAmount: 300 };
  const on300 = { enabled: true, minOrderAmount: 300 };

  it("is false when both offers are off, regardless of subtotal or first-order status", () => {
    expect(freeDeliveryApplies(10000, true, { firstOrder: off, allOrders: off })).toBe(false);
  });

  it("first-order offer applies only for a first order at/above its amount", () => {
    expect(freeDeliveryApplies(300, true, { firstOrder: on300, allOrders: off })).toBe(true);
    expect(freeDeliveryApplies(299, true, { firstOrder: on300, allOrders: off })).toBe(false);
    expect(freeDeliveryApplies(500, false, { firstOrder: on300, allOrders: off })).toBe(false);
  });

  it("all-orders offer applies for any order (not just first) at/above its amount", () => {
    expect(freeDeliveryApplies(300, false, { firstOrder: off, allOrders: on300 })).toBe(true);
    expect(freeDeliveryApplies(299, false, { firstOrder: off, allOrders: on300 })).toBe(false);
  });

  it("applies if either offer alone would apply, when both are on", () => {
    const firstOrder = { enabled: true, minOrderAmount: 1000 };
    const allOrders = { enabled: true, minOrderAmount: 300 };
    // Below the first-order amount but above the all-orders amount, first order:
    expect(freeDeliveryApplies(500, true, { firstOrder, allOrders })).toBe(true);
    // Same subtotal, not a first order — only the all-orders offer can apply:
    expect(freeDeliveryApplies(500, false, { firstOrder, allOrders })).toBe(true);
    // Below both amounts:
    expect(freeDeliveryApplies(200, true, { firstOrder, allOrders })).toBe(false);
  });
});

describe("getFreeDeliveryReason", () => {
  const off = { enabled: false, minOrderAmount: 300 };
  const on300 = { enabled: true, minOrderAmount: 300 };

  it("returns null when no offer applies", () => {
    expect(getFreeDeliveryReason(10000, true, { firstOrder: off, allOrders: off })).toBeNull();
  });

  it("names the first-order offer when that's the one that applies", () => {
    expect(getFreeDeliveryReason(300, true, { firstOrder: on300, allOrders: off })).toBe("First order free delivery offer");
  });

  it("names the all-orders offer when that's the one that applies", () => {
    expect(getFreeDeliveryReason(300, false, { firstOrder: off, allOrders: on300 })).toBe("Free delivery on all orders");
  });

  it("freeDeliveryApplies agrees with getFreeDeliveryReason on every case (one derives from the other)", () => {
    const firstOrder = { enabled: true, minOrderAmount: 1000 };
    const allOrders = { enabled: true, minOrderAmount: 300 };
    expect(freeDeliveryApplies(500, true, { firstOrder, allOrders })).toBe(getFreeDeliveryReason(500, true, { firstOrder, allOrders }) !== null);
    expect(freeDeliveryApplies(200, true, { firstOrder, allOrders })).toBe(getFreeDeliveryReason(200, true, { firstOrder, allOrders }) !== null);
  });
});

describe("computeVatAmount", () => {
  it("returns 0 when the VAT rate is 0", () => {
    expect(computeVatAmount(1000, 0)).toBe(0);
  });

  it("computes VAT as a percentage of the subtotal", () => {
    expect(computeVatAmount(1000, 15)).toBe(150);
  });
});

describe("round2", () => {
  it("rounds to two decimal places", () => {
    expect(round2(10.126)).toBe(10.13);
    expect(round2(10.004)).toBe(10);
  });
});
