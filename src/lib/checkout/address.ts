import "server-only";
import { db } from "@/lib/db";

const ADDRESS_INCLUDE = { neighbourhood: { include: { town: true } }, deliveryZone: true } as const;

/** Never trust an address id alone — only returns it if it belongs to this user. */
export function findOwnedAddress(userId: string, addressId: string) {
  return db.address.findFirst({ where: { id: addressId, userId } });
}

/**
 * Same lookup, with the relations checkout needs, but never exposes another
 * customer's address: if the checkout cookie's addressId doesn't belong to
 * this user (forged, stale, or left over from a shared device), it's
 * ignored and we fall back to the user's own default address instead.
 */
export async function getCheckoutAddressOrDefault(userId: string, addressId: string | undefined) {
  const matched = addressId ? await db.address.findFirst({ where: { id: addressId, userId }, include: ADDRESS_INCLUDE }) : null;
  if (matched) return matched;
  return db.address.findFirst({ where: { userId, isDefault: true }, include: ADDRESS_INCLUDE });
}
