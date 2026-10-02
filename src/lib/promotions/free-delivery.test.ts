// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";
import { db } from "@/lib/db";
import { isFirstOrderCustomer } from "./free-delivery";

/**
 * Regression tests: a cancelled/failed first order must not burn the
 * customer's first-order free-delivery eligibility — only an order that
 * actually went somewhere (in-progress or delivered) should. Creates a
 * throwaway customer per test so this never depends on (or disturbs) the
 * real seeded customer's order history.
 */
describe("isFirstOrderCustomer", () => {
  const createdUserIds: string[] = [];
  const createdOrderGroupIds: string[] = [];

  afterEach(async () => {
    for (const id of createdOrderGroupIds.splice(0)) {
      await db.orderGroup.delete({ where: { id } }).catch(() => {});
    }
    for (const id of createdUserIds.splice(0)) {
      await db.user.delete({ where: { id } }).catch(() => {});
    }
  });

  async function makeTestCustomer() {
    const user = await db.user.create({
      data: { phone: `+8801999${Math.floor(Math.random() * 1000000)}`, name: "Test Customer", passwordHash: "x", role: "CUSTOMER" },
    });
    createdUserIds.push(user.id);
    return user;
  }

  async function makeOrderGroupWithStatus(customerId: string, vendorId: string, addressId: string, deliveryZoneId: string, status: "CANCELLED" | "FAILED_DELIVERY" | "DELIVERED" | "ORDER_PLACED") {
    const suffix = `FIRSTORDERTEST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const orderGroup = await db.orderGroup.create({
      data: { groupNumber: suffix, customerId, subtotal: 500, deliveryFeeTotal: 20, grandTotal: 520 },
    });
    createdOrderGroupIds.push(orderGroup.id);
    await db.order.create({
      data: {
        orderNumber: suffix,
        orderGroupId: orderGroup.id,
        customerId,
        vendorId,
        addressId,
        deliveryZoneId,
        status,
        subtotal: 500,
        deliveryFee: 20,
        total: 520,
        commissionRatePct: 10,
        commissionAmount: 50,
        vendorEarnings: 450,
      },
    });
    return orderGroup;
  }

  it("is true for a customer with no orders at all", async () => {
    const customer = await makeTestCustomer();
    expect(await isFirstOrderCustomer(customer.id)).toBe(true);
  });

  it("stays true after a CANCELLED order — it never burns first-order eligibility", async () => {
    const customer = await makeTestCustomer();
    const vendorUser = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000002" } });
    const vendor = await db.vendor.findUniqueOrThrow({ where: { userId: vendorUser.id } });
    const sharedAddress = await db.address.findFirstOrThrow({ where: { userId: (await db.user.findUniqueOrThrow({ where: { phone: "+8801700000008" } })).id } });
    const zone = await db.deliveryZone.findFirstOrThrow({ where: { neighbourhoodId: sharedAddress.neighbourhoodId ?? undefined } });
    // A test customer has no address of their own — reuse the seeded demo
    // customer's address purely as a valid foreign key, the order is never
    // actually fulfilled in this test.
    await makeOrderGroupWithStatus(customer.id, vendor.id, sharedAddress.id, zone.id, "CANCELLED");

    expect(await isFirstOrderCustomer(customer.id)).toBe(true);
  });

  it("stays true after a FAILED_DELIVERY order", async () => {
    const customer = await makeTestCustomer();
    const vendorUser = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000002" } });
    const vendor = await db.vendor.findUniqueOrThrow({ where: { userId: vendorUser.id } });
    const sharedAddress = await db.address.findFirstOrThrow({ where: { userId: (await db.user.findUniqueOrThrow({ where: { phone: "+8801700000008" } })).id } });
    const zone = await db.deliveryZone.findFirstOrThrow({ where: { neighbourhoodId: sharedAddress.neighbourhoodId ?? undefined } });
    await makeOrderGroupWithStatus(customer.id, vendor.id, sharedAddress.id, zone.id, "FAILED_DELIVERY");

    expect(await isFirstOrderCustomer(customer.id)).toBe(true);
  });

  it("becomes false once a real (non-cancelled/failed) order exists", async () => {
    const customer = await makeTestCustomer();
    const vendorUser = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000002" } });
    const vendor = await db.vendor.findUniqueOrThrow({ where: { userId: vendorUser.id } });
    const sharedAddress = await db.address.findFirstOrThrow({ where: { userId: (await db.user.findUniqueOrThrow({ where: { phone: "+8801700000008" } })).id } });
    const zone = await db.deliveryZone.findFirstOrThrow({ where: { neighbourhoodId: sharedAddress.neighbourhoodId ?? undefined } });
    await makeOrderGroupWithStatus(customer.id, vendor.id, sharedAddress.id, zone.id, "DELIVERED");

    expect(await isFirstOrderCustomer(customer.id)).toBe(false);
  });
});
