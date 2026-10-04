import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MapPin, Clock, CreditCard } from "lucide-react";
import { Container } from "@/components/ui/container";
import { CheckoutSteps } from "@/components/checkout/checkout-steps";
import { PlaceOrderButton } from "@/components/checkout/place-order-button";
import { getCurrentUser } from "@/lib/auth/session";
import { getFullCart } from "@/lib/cart/queries";
import { getCheckoutState } from "@/lib/checkout/cookie";
import { getSelectedCouponCode } from "@/lib/cart/coupon-cookie";
import { validateCoupon } from "@/lib/cart/coupon";
import { groupSubtotal, computeCouponDiscount, freeDeliveryApplies, round2 } from "@/lib/cart/totals";
import { getFreeDeliveryPromoSettingsUncached, isFirstOrderCustomer } from "@/lib/promotions/free-delivery";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/utils";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { formatVariantLabel } from "@/lib/catalog/variant-label";

export const metadata: Metadata = { title: "Checkout — Review order" };

export default async function CheckoutReviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkout");

  const state = await getCheckoutState();
  if (!state.addressId) redirect("/checkout");
  if (!state.paymentMethod) redirect("/checkout/payment");

  const [{ groups }, address, couponCode, locale] = await Promise.all([
    getFullCart(user.id),
    db.address.findUnique({ where: { id: state.addressId }, include: { neighbourhood: { include: { town: true } }, deliveryZone: true } }),
    getSelectedCouponCode(),
    getLocale(),
  ]);

  if (groups.length === 0) redirect("/cart");
  if (!address?.deliveryZone) redirect("/checkout");

  const subtotal = groupSubtotal(
    groups.flatMap((g) => g.lines.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity, addOnsTotal: l.addOnsTotal }))),
  );

  let discount = 0;
  if (couponCode) {
    const result = await validateCoupon(couponCode, user.id, subtotal);
    if (result.ok) discount = computeCouponDiscount(subtotal, result.coupon);
  }

  // Uncached — this is the last preview before a real charge, so it must
  // always agree exactly with placeOrderAction's own uncached read.
  const [freeDeliveryPromo, isFirstOrder] = await Promise.all([getFreeDeliveryPromoSettingsUncached(), isFirstOrderCustomer(user.id)]);
  const deliveryIsFree = freeDeliveryApplies(subtotal, isFirstOrder, freeDeliveryPromo);

  // Per-zone freeDeliveryThreshold is no longer used for fee calculations —
  // free delivery is now decided entirely by the sitewide offers above. The
  // zone still sets the flat per-vendor fee amount when neither offer applies.
  const deliveryTotal = deliveryIsFree ? 0 : round2(Number(address.deliveryZone!.deliveryFee) * groups.length);

  const total = round2(subtotal - discount + deliveryTotal);

  return (
    <Container className="py-8">
      <CheckoutSteps current="review" />
      <div className="mx-auto max-w-lg space-y-5">
        <h1 className="font-heading text-xl font-bold text-brand-dark">Review your order</h1>

        <div className="rounded-card border border-border-brand bg-white p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold text-brand-dark">
            <MapPin className="h-4 w-4 text-brand-primary" aria-hidden />
            Delivering to
          </p>
          <p className="mt-1 text-gray-600">
            {address.recipientName} · {address.recipientPhone}
            <br />
            {address.streetOrVillage}, {address.neighbourhood?.name}, {address.neighbourhood?.town.name}
          </p>
        </div>

        <div className="rounded-card border border-border-brand bg-white p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold text-brand-dark">
            <Clock className="h-4 w-4 text-brand-primary" aria-hidden />
            Delivery time
          </p>
          <p className="mt-1 text-gray-600">
            {state.scheduledFor ? new Date(state.scheduledFor).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" }) : "As soon as possible"}
          </p>
        </div>

        <div className="rounded-card border border-border-brand bg-white p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold text-brand-dark">
            <CreditCard className="h-4 w-4 text-brand-primary" aria-hidden />
            Payment method
          </p>
          <p className="mt-1 text-gray-600">{state.paymentMethod}</p>
        </div>

        <div className="rounded-card border border-border-brand bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-brand-dark">Items</p>
          {groups.map((group) => (
            <div key={group.vendorId} className="mb-3 last:mb-0">
              <p className="text-xs font-semibold text-gray-500">{group.vendorBusinessName}</p>
              {group.restaurantStatus && !group.restaurantStatus.isOpenNow && (
                <p className="mb-1 rounded-control bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
                  Closed now — prepared once they open{group.restaurantStatus.nextOpen ? ` ${group.restaurantStatus.nextOpen.label} at ${group.restaurantStatus.nextOpen.time}` : ""}.
                </p>
              )}
              {group.lines.map((line) => (
                <div key={line.id} className="flex justify-between py-1 text-sm">
                  <span className="text-gray-700">
                    {line.quantity}× {line.name}
                    {line.variant && <span className="text-gray-500"> — {formatVariantLabel(line.variant, locale)}</span>}
                    {line.selectedAddOns.length > 0 && (
                      <span className="block text-xs text-gray-500">+ {line.selectedAddOns.map((a) => a.name).join(", ")}</span>
                    )}
                  </span>
                  <span className="text-brand-dark">{formatBDT((line.unitPrice + line.addOnsTotal) * line.quantity)}</span>
                </div>
              ))}
            </div>
          ))}

          <dl className="mt-3 space-y-1.5 border-t border-border-brand pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Subtotal</dt>
              <dd>{formatBDT(subtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-brand-primary">
                <dt>Discount</dt>
                <dd>-{formatBDT(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-600">Delivery</dt>
              <dd>{formatBDT(deliveryTotal)}</dd>
            </div>
            <div className="flex justify-between border-t border-border-brand pt-1.5 text-base font-bold text-brand-dark">
              <dt>Total</dt>
              <dd>{formatBDT(total)}</dd>
            </div>
          </dl>
        </div>

        <PlaceOrderButton />
      </div>
    </Container>
  );
}
