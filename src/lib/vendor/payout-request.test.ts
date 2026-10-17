// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";
import { db } from "@/lib/db";
import { createVendorPayoutRequest } from "./payout-request";

/**
 * Regression coverage for FIN-1/FIN-3: requestPayoutAction used to
 * recompute "available" from PENDING-only payouts with no transaction or
 * lock, so (a) a vendor could request a second payout for money an admin
 * had already approved but not yet paid, and (b) two concurrent requests
 * could both read the same stale balance and both succeed.
 */
describe("createVendorPayoutRequest", () => {
  let vendorUserId: string | undefined;
  let vendorId: string | undefined;
  const orderGroupIds: string[] = [];

  afterEach(async () => {
    if (vendorId) await db.vendorPayout.deleteMany({ where: { vendorId } }).catch(() => {});
    for (const id of orderGroupIds.splice(0)) await db.orderGroup.delete({ where: { id } }).catch(() => {});
    if (vendorId) await db.vendor.delete({ where: { id: vendorId } }).catch(() => {});
    if (vendorUserId) await db.user.delete({ where: { id: vendorUserId } }).catch(() => {});
    vendorUserId = vendorId = undefined;
  });

  async function setupVendorWithEarnings(earnings: number) {
    const suffix = `payout-req-${Date.now()}`;
    const user = await db.user.create({ data: { role: "VENDOR", name: "Payout Request Test Vendor", phone: `+8806${Date.now()}`, passwordHash: "test" } });
    vendorUserId = user.id;
    const vendor = await db.vendor.create({
      data: {
        userId: user.id,
        businessName: `Payout Request Test Vendor ${suffix}`,
        slug: suffix,
        businessType: "GROCERY_VENDOR",
        phone: user.phone,
        email: `${suffix}@example.com`,
        addressText: "Test address",
        commissionRatePct: 0,
      },
    });
    vendorId = vendor.id;

    const customer = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000008" } });
    const address = await db.address.findFirstOrThrow({ where: { userId: customer.id } });
    const zone = await db.deliveryZone.findFirstOrThrow({ where: { neighbourhoodId: address.neighbourhoodId ?? undefined } });

    const orderGroup = await db.orderGroup.create({
      data: { groupNumber: suffix, customerId: customer.id, subtotal: earnings, deliveryFeeTotal: 0, grandTotal: earnings },
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
        status: "DELIVERED",
        subtotal: earnings,
        deliveryFee: 0,
        total: earnings,
        commissionRatePct: 0,
        commissionAmount: 0,
        vendorEarnings: earnings,
      },
    });
    await db.commissionEntry.create({ data: { orderId: order.id, vendorId: vendor.id, ratePct: 0, commissionAmount: 0, vendorEarnings: earnings } });

    return vendor;
  }

  it("rejects a second request once the first has been approved (the double-spend this fix closes)", async () => {
    const vendor = await setupVendorWithEarnings(500);

    const first = await createVendorPayoutRequest(vendor.id, 500);
    expect(first.ok).toBe(true);

    const pending = await db.vendorPayout.findFirstOrThrow({ where: { vendorId: vendor.id } });
    await db.vendorPayout.update({ where: { id: pending.id }, data: { status: "APPROVED" } });

    const second = await createVendorPayoutRequest(vendor.id, 1);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.available).toBe(0);
  });

  it("exactly one of two concurrent requests for the full balance succeeds", async () => {
    const vendor = await setupVendorWithEarnings(1000);

    const [a, b] = await Promise.all([createVendorPayoutRequest(vendor.id, 1000), createVendorPayoutRequest(vendor.id, 1000)]);
    const successes = [a.ok, b.ok].filter(Boolean).length;
    expect(successes).toBe(1);

    const payouts = await db.vendorPayout.findMany({ where: { vendorId: vendor.id } });
    expect(payouts).toHaveLength(1);
  });

  it("a REJECTED payout releases its reserved amount for a new request", async () => {
    const vendor = await setupVendorWithEarnings(300);

    const first = await createVendorPayoutRequest(vendor.id, 300);
    expect(first.ok).toBe(true);
    const pending = await db.vendorPayout.findFirstOrThrow({ where: { vendorId: vendor.id } });
    await db.vendorPayout.update({ where: { id: pending.id }, data: { status: "REJECTED" } });

    const second = await createVendorPayoutRequest(vendor.id, 300);
    expect(second.ok).toBe(true);
  });

  it("normal request within the available balance still succeeds", async () => {
    const vendor = await setupVendorWithEarnings(200);
    const result = await createVendorPayoutRequest(vendor.id, 150);
    expect(result.ok).toBe(true);
  });
});
