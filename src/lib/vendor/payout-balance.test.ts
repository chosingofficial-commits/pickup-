// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";
import { db } from "@/lib/db";
import { getVendorPayoutBalance } from "./payout-balance";
import { getVendorPaymentSummary } from "@/lib/admin/money";

/**
 * Regression coverage for FIN-1/FIN-4: "available" used to be computed
 * three different ways in three different files (the payouts page, the
 * vendor dashboard, requestPayoutAction), none of which reserved APPROVED
 * payouts — only PENDING — and the admin-wide "owed to vendors" figure used
 * a fourth, independent formula that didn't reserve anything in-flight at
 * all. This is now the one function all of them call.
 */
describe("getVendorPayoutBalance", () => {
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
    const suffix = `bal-test-${Date.now()}`;
    const user = await db.user.create({ data: { role: "VENDOR", name: "Balance Test Vendor", phone: `+8807${Date.now()}`, passwordHash: "test" } });
    vendorUserId = user.id;
    const vendor = await db.vendor.create({
      data: {
        userId: user.id,
        businessName: `Balance Test Vendor ${suffix}`,
        slug: suffix,
        businessType: "GROCERY_VENDOR",
        phone: user.phone,
        email: `${suffix}@example.com`,
        addressText: "Test address",
        commissionRatePct: 0,
      },
    });
    vendorId = vendor.id;
    return vendor;
  }

  async function createOrder(vendor: { id: string }, status: "DELIVERED" | "ORDER_PLACED", vendorEarnings: number) {
    const customer = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000008" } });
    const address = await db.address.findFirstOrThrow({ where: { userId: customer.id } });
    const zone = await db.deliveryZone.findFirstOrThrow({ where: { neighbourhoodId: address.neighbourhoodId ?? undefined } });
    const suffix = `BAL-ORDER-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const orderGroup = await db.orderGroup.create({
      data: { groupNumber: suffix, customerId: customer.id, subtotal: vendorEarnings, deliveryFeeTotal: 0, grandTotal: vendorEarnings },
    });
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
        subtotal: vendorEarnings,
        deliveryFee: 0,
        total: vendorEarnings,
        commissionRatePct: 0,
        commissionAmount: 0,
        vendorEarnings,
      },
    });
    await db.commissionEntry.create({ data: { orderId: order.id, vendorId: vendor.id, ratePct: 0, commissionAmount: 0, vendorEarnings } });
    return order;
  }

  async function createPayout(vendor: { id: string }, amount: number, status: "PENDING" | "APPROVED" | "PAID" | "REJECTED") {
    const now = new Date();
    const payout = await db.vendorPayout.create({
      data: { vendorId: vendor.id, amount, status, periodStart: now, periodEnd: now, processedAt: status === "PAID" ? now : undefined },
    });
    payoutIds.push(payout.id);
    return payout;
  }

  it("counts only DELIVERED orders' CommissionEntry.vendorEarnings toward earnings", async () => {
    const vendor = await setupVendor();
    await createOrder(vendor, "DELIVERED", 100);
    await createOrder(vendor, "ORDER_PLACED", 50);

    const balance = await getVendorPayoutBalance(vendor.id);
    expect(balance.earnings).toBe(100);
  });

  it("reserves PENDING and APPROVED payouts, but not PAID or REJECTED; available = earnings - reserved - paid", async () => {
    const vendor = await setupVendor();
    await createOrder(vendor, "DELIVERED", 1000);
    await createPayout(vendor, 200, "PENDING");
    await createPayout(vendor, 150, "APPROVED");
    await createPayout(vendor, 100, "PAID");
    await createPayout(vendor, 999, "REJECTED");

    const balance = await getVendorPayoutBalance(vendor.id);
    expect(balance.earnings).toBe(1000);
    expect(balance.reserved).toBe(350);
    expect(balance.paid).toBe(100);
    expect(balance.available).toBe(550);
  });

  it("omitting vendorId computes a platform-wide total that includes this vendor's earnings", async () => {
    // Compares against the platform-wide total directly rather than a
    // before/after delta — other test files run concurrently against the
    // same local database, so a delta across two separate snapshots in
    // time can be polluted by their activity. The platform-wide sum can
    // never be smaller than any one vendor's own earnings, concurrent
    // activity or not, which is what this is actually checking: that
    // omitting vendorId doesn't wrongly scope the query down to nothing.
    const vendor = await setupVendor();
    await createOrder(vendor, "DELIVERED", 777);

    const [vendorBalance, platformBalance] = await Promise.all([getVendorPayoutBalance(vendor.id), getVendorPayoutBalance()]);
    expect(vendorBalance.earnings).toBe(777);
    expect(platformBalance.earnings).toBeGreaterThanOrEqual(vendorBalance.earnings);
  });

  it("agrees exactly with the admin Money overview's 'owed to vendors' figure (FIN-4 regression)", async () => {
    const vendor = await setupVendor();
    await createOrder(vendor, "DELIVERED", 321);

    const [platformBalance, moneyOverview] = await Promise.all([getVendorPayoutBalance(), getVendorPaymentSummary("today")]);
    expect(moneyOverview.vendorsOwedAllTimeTk).toBe(platformBalance.available);
  });
});
