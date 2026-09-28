import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { CartLineRow } from "@/components/cart/cart-line-row";
import { CouponForm } from "@/components/cart/coupon-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getFullCart } from "@/lib/cart/queries";
import { getSelectedLocation } from "@/lib/location/cookie";
import { getSelectedCouponCode } from "@/lib/cart/coupon-cookie";
import { validateCoupon } from "@/lib/cart/coupon";
import { getSiteSettings, SITE_SETTING_KEYS } from "@/lib/settings";
import { getFreeDeliveryPromoSettings, isFirstOrderCustomer } from "@/lib/promotions/free-delivery";
import { groupSubtotal, computeCouponDiscount, computeVatAmount, freeDeliveryPromoApplies, round2 } from "@/lib/cart/totals";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Your cart" };

export default async function CartPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Container className="flex flex-col items-center gap-4 py-20 text-center">
        <ShoppingBag className="h-12 w-12 text-gray-300" aria-hidden />
        <h1 className="font-heading text-xl font-bold text-brand-dark">Log in to see your cart</h1>
        <Link href="/login?next=/cart" className="rounded-control bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover">
          Log in
        </Link>
      </Container>
    );
  }

  const [{ groups }, location, couponCode, settings, freeDeliveryPromo, isFirstOrder] = await Promise.all([
    getFullCart(user.id),
    getSelectedLocation(),
    getSelectedCouponCode(),
    getSiteSettings(),
    getFreeDeliveryPromoSettings(),
    isFirstOrderCustomer(user.id),
  ]);

  if (groups.length === 0) {
    return (
      <Container className="flex flex-col items-center gap-4 py-20 text-center">
        <ShoppingBag className="h-12 w-12 text-gray-300" aria-hidden />
        <h1 className="font-heading text-xl font-bold text-brand-dark">Your cart is empty</h1>
        <p className="text-sm text-gray-600">Add groceries, essentials, or a restaurant meal to get started.</p>
        <Link href="/marketplace" className="rounded-control bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover">
          Continue shopping
        </Link>
      </Container>
    );
  }

  const subtotal = groupSubtotal(groups.flatMap((g) => g.lines.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity, addOnsTotal: l.addOnsTotal }))));

  const vatRatePct = Number(settings[SITE_SETTING_KEYS.vatRatePct]);
  const vatAmount = computeVatAmount(subtotal, vatRatePct);

  // Note: the per-vendor "spend X in this zone, get free delivery" rule
  // (computeVendorDeliveryFee against the zone's own freeDeliveryThreshold)
  // isn't estimated here — this page only has the delivery fee from the
  // location cookie, not the zone's threshold, so showing a plain per-group
  // fee is a safe (if occasionally pessimistic) preview; checkout/review
  // has the real zone data and is the authoritative number. The first-order
  // promo below is sitewide, so it doesn't need zone data and applies here too.
  const deliveryFeePerGroup = location?.isCovered ? Number(location.deliveryFee ?? 0) : null;
  const freeDeliveryPromoApplied = freeDeliveryPromoApplies(subtotal, isFirstOrder, freeDeliveryPromo);
  const deliveryTotal = deliveryFeePerGroup == null ? null : freeDeliveryPromoApplied ? 0 : deliveryFeePerGroup * groups.length;

  let discount = 0;
  let couponError: string | null = null;
  if (couponCode) {
    const result = await validateCoupon(couponCode, user.id, subtotal);
    if (result.ok) discount = computeCouponDiscount(subtotal, result.coupon);
    else couponError = result.message;
  }

  const total = round2(subtotal - discount + vatAmount + (deliveryTotal ?? 0));
  const hasUnavailable = groups.some((g) => g.lines.some((l) => !l.isAvailable));

  return (
    <Container className="py-8">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Your cart</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.vendorId} className="rounded-card border border-border-brand bg-white p-4">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="font-heading text-sm font-bold text-brand-dark">{group.vendorBusinessName}</h2>
                <span className="text-xs text-gray-500">{group.vendorBusinessType === "RESTAURANT" ? "Restaurant" : "Vendor"}</span>
              </div>
              <div>
                {group.lines.map((line) => (
                  <CartLineRow key={line.id} line={line} />
                ))}
              </div>
            </div>
          ))}
          {hasUnavailable && (
            <p className="text-sm text-amber-700">
              Some items in your cart are no longer available and won&apos;t be included at checkout.
            </p>
          )}
          <Link href="/marketplace" className="inline-block text-sm font-semibold text-brand-primary hover:underline">
            ← Continue shopping
          </Link>
        </div>

        <div className="h-fit space-y-4 rounded-card border border-border-brand bg-white p-5">
          <CouponForm appliedCode={couponError ? null : couponCode} />
          {couponError && <p className="text-xs text-red-600">{couponError}</p>}

          <dl className="space-y-2 border-t border-border-brand pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Subtotal</dt>
              <dd className="font-medium text-brand-dark">{formatBDT(subtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-brand-primary">
                <dt>Discount</dt>
                <dd>-{formatBDT(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-600">Delivery charge</dt>
              <dd className="font-medium text-brand-dark">
                {deliveryTotal != null ? formatBDT(deliveryTotal) : "Calculated at checkout"}
              </dd>
            </div>
            {vatAmount > 0 && (
              <div className="flex justify-between">
                <dt className="text-gray-600">VAT</dt>
                <dd className="font-medium text-brand-dark">{formatBDT(vatAmount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border-brand pt-2 text-base font-bold text-brand-dark">
              <dt>Total</dt>
              <dd>{formatBDT(total)}</dd>
            </div>
          </dl>

          <Link
            href="/checkout"
            className="flex items-center justify-center gap-2 rounded-control bg-brand-primary py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover"
          >
            Proceed to checkout
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </Container>
  );
}
