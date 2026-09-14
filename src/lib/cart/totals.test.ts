import { describe, it, expect } from "vitest";
import { lineTotal, groupSubtotal, computeCouponDiscount, computeVendorDeliveryFee, computeVatAmount, round2 } from "./totals";

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

describe("computeVendorDeliveryFee", () => {
  it("charges the zone's delivery fee below the free-delivery threshold", () => {
    expect(computeVendorDeliveryFee(200, { deliveryFee: 30, freeDeliveryThreshold: 500 })).toBe(30);
  });

  it("waives delivery fee at or above the free-delivery threshold", () => {
    expect(computeVendorDeliveryFee(500, { deliveryFee: 30, freeDeliveryThreshold: 500 })).toBe(0);
    expect(computeVendorDeliveryFee(600, { deliveryFee: 30, freeDeliveryThreshold: 500 })).toBe(0);
  });

  it("always charges the fee when there is no free-delivery threshold", () => {
    expect(computeVendorDeliveryFee(999999, { deliveryFee: 30, freeDeliveryThreshold: null })).toBe(30);
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
