// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";
import { db } from "@/lib/db";
import { findOwnedAddress, getCheckoutAddressOrDefault } from "./address";

/**
 * Regression coverage for SEC-1: selectCheckoutAddressAction used to write
 * whatever addressId a form submitted straight into the checkout cookie
 * with no ownership check, and the review page then rendered that address's
 * name/phone/street with no check either — so a forged or stale addressId
 * belonging to a different customer leaked their PII. Both helpers here are
 * what the action and the review page now go through instead.
 */
describe("checkout address ownership (SEC-1 regression)", () => {
  let counter = 0;
  const userIds: string[] = [];
  const addressIds: string[] = [];

  afterEach(async () => {
    for (const id of addressIds) await db.address.delete({ where: { id } }).catch(() => {});
    for (const id of userIds) await db.user.delete({ where: { id } }).catch(() => {});
    userIds.length = 0;
    addressIds.length = 0;
  });

  async function makeCustomerWithAddress(label: string) {
    counter += 1;
    const neighbourhood = await db.neighbourhood.findFirstOrThrow();
    const user = await db.user.create({
      data: { role: "CUSTOMER", name: `IDOR Test ${label}`, phone: `+8809${Date.now()}${counter}`, passwordHash: "test" },
    });
    userIds.push(user.id);
    const address = await db.address.create({
      data: {
        userId: user.id,
        recipientName: `IDOR Test ${label}`,
        recipientPhone: user.phone,
        neighbourhoodId: neighbourhood.id,
        streetOrVillage: "123 Test Road",
        isDefault: true,
      },
    });
    addressIds.push(address.id);
    return { user, address };
  }

  it("findOwnedAddress: customer A cannot fetch customer B's address, but can fetch their own", async () => {
    const a = await makeCustomerWithAddress("A");
    const b = await makeCustomerWithAddress("B");

    const forged = await findOwnedAddress(a.user.id, b.address.id);
    expect(forged).toBeNull();

    const own = await findOwnedAddress(a.user.id, a.address.id);
    expect(own?.id).toBe(a.address.id);
  });

  it("getCheckoutAddressOrDefault: a forged/stale addressId for another customer falls back to the current user's own default address, never the other customer's", async () => {
    const a = await makeCustomerWithAddress("C");
    const b = await makeCustomerWithAddress("D");

    const result = await getCheckoutAddressOrDefault(a.user.id, b.address.id);
    expect(result?.id).toBe(a.address.id);
    expect(result?.id).not.toBe(b.address.id);
    expect(result?.recipientPhone).not.toBe(b.address.recipientPhone);
  });

  it("getCheckoutAddressOrDefault: a customer's own addressId is returned normally", async () => {
    const a = await makeCustomerWithAddress("E");

    const result = await getCheckoutAddressOrDefault(a.user.id, a.address.id);
    expect(result?.id).toBe(a.address.id);
  });
});
