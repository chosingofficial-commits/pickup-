// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";
import { db } from "@/lib/db";
import { computeEligibility, getVendorMoneyBreakdown } from "./vendor-payouts";
import { getVendorPayoutBalance } from "@/lib/vendor/payout-balance";

describe("computeEligibility", () => {
  it("amount <= available for this request -> can be paid", () => {
    // earnings 1000, paid 0, reserved (all pending/approved, including this one) 400
    const result = computeEligibility(400, { earnings: 1000, paid: 0, reserved: 400 });
    expect(result.reservedByOthers).toBe(0); // this request is the only one reserved, so others = 0
    expect(result.availableForThisRequest).toBe(1000);
    expect(result.canBePaid).toBe(true);
    expect(result.shortByTk).toBe(0);
  });

  it("amount > available for this request -> blocked, with the correct shortfall", () => {
    // earnings 1000, paid 0, reserved 1500 (this request 400 + another 1100 already reserved)
    const result = computeEligibility(400, { earnings: 1000, paid: 0, reserved: 1500 });
    expect(result.reservedByOthers).toBe(1100);
    expect(result.availableForThisRequest).toBe(-100); // 1000 - 0 - 1100
    expect(result.canBePaid).toBe(false);
    expect(result.shortByTk).toBe(500); // needed 400, had -100 available -> short by 500
  });

  it("does not double-count this request's own amount against itself", () => {
    // Only one request exists, reserved === its own amount — it must not be treated as "reserved by someone else."
    const result = computeEligibility(250, { earnings: 250, paid: 0, reserved: 250 });
    expect(result.reservedByOthers).toBe(0);
    expect(result.availableForThisRequest).toBe(250);
    expect(result.canBePaid).toBe(true);
  });
});

describe("getVendorMoneyBreakdown", () => {
  let vendorUserId: string | undefined;
  let vendorId: string | undefined;
  const orderGroupIds: string[] = [];
  const payoutIds: string[] = [];

  afterEach(async () => {
    for (const id of payoutIds.splice(0)) await db.vendorPayout.delete({ where: { id } }).catch(() => {});
    for (const id of orderGroupIds.splice(0)) await db.orderGroup.delete({ where: { id } }).catch(() => {});
    if (vendorId) await db.vendor.delete({ where: { id: vendorId } }).catch(() => {});
    if (vendorUserId) await db.user.delete({ where: { id: vendorUserId } }).catch(() => {});
    vendorUserId = vendorId = undefined;
  });

  async function setupVendor() {
    const suffix = `breakdown-test-${Date.now()}`;
    const user = await db.user.create({ data: { role: "VENDOR", name: "Breakdown Test Vendor", phone: `+8804${Date.now()}`, passwordHash: "test" } });
    vendorUserId = user.id;
    const vendor = await db.vendor.create({
      data: { userId: user.id, businessName: `Breakdown Test Vendor ${suffix}`, slug: suffix, businessType: "GROCERY_VENDOR", phone: user.phone, email: `${suffix}@example.com`, addressText: "Test address", commissionRatePct: 0 },
    });
    vendorId = vendor.id;
    return vendor;
  }

  async function createOrder(vendor: { id: string }, status: "DELIVERED" | "ORDER_PLACED" | "REFUNDED", amount: number) {
    const customer = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000008" } });
    const address = await db.address.findFirstOrThrow({ where: { userId: customer.id } });
    const zone = await db.deliveryZone.findFirstOrThrow({ where: { neighbourhoodId: address.neighbourhoodId ?? undefined } });
    const suffix = `BRK-ORDER-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const orderGroup = await db.orderGroup.create({ data: { groupNumber: suffix, customerId: customer.id, subtotal: amount, deliveryFeeTotal: 0, grandTotal: amount } });
    orderGroupIds.push(orderGroup.id);

    const order = await db.order.create({
      data: {
        orderNumber: suffix,
        orderGroupId: orderGroup.id,
        customerId: customer.id,
        vendorId: vendor.id,
        addressId: address.id,
        deliveryZoneId: zone.id,
        status,
        subtotal: amount,
        deliveryFee: 0,
        total: amount,
        commissionRatePct: 0,
        commissionAmount: 0,
        vendorEarnings: amount,
      },
    });
    await db.commissionEntry.create({ data: { orderId: order.id, vendorId: vendor.id, ratePct: 0, commissionAmount: 0, vendorEarnings: amount } });
    return order;
  }

  it("agrees exactly with getVendorPayoutBalance (the vendor's own payouts page formula) for earnings/paid/reserved/available", async () => {
    const vendor = await setupVendor();
    await createOrder(vendor, "DELIVERED", 500);
    const now = new Date();
    const payout = await db.vendorPayout.create({ data: { vendorId: vendor.id, amount: 200, status: "PENDING", periodStart: now, periodEnd: now } });
    payoutIds.push(payout.id);

    const [breakdown, balance] = await Promise.all([getVendorMoneyBreakdown(vendor.id), getVendorPayoutBalance(vendor.id)]);

    expect(breakdown.earningsTk).toBe(balance.earnings);
    expect(breakdown.paidTk).toBe(balance.paid);
    expect(breakdown.reservedTk).toBe(balance.reserved);
    expect(breakdown.availableTk).toBe(balance.available);
  });

  it("excludes REFUNDED orders from earnings and counts them under 'excluded' instead", async () => {
    const vendor = await setupVendor();
    await createOrder(vendor, "DELIVERED", 300);
    await createOrder(vendor, "REFUNDED", 150);

    const breakdown = await getVendorMoneyBreakdown(vendor.id);
    expect(breakdown.earningsTk).toBe(300); // the refunded order's 150 never counts
    expect(breakdown.excluded.count).toBe(1);
    expect(breakdown.excluded.amountTk).toBe(150);
  });

  it("counts in-progress (not yet delivered) orders separately, not in earnings", async () => {
    const vendor = await setupVendor();
    await createOrder(vendor, "DELIVERED", 100);
    await createOrder(vendor, "ORDER_PLACED", 777);

    const breakdown = await getVendorMoneyBreakdown(vendor.id);
    expect(breakdown.earningsTk).toBe(100);
    expect(breakdown.inProgress.count).toBe(1);
    expect(breakdown.inProgress.itemSalesTk).toBe(777);
  });
});
