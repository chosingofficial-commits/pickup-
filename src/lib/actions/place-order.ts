"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getFullCart } from "@/lib/cart/queries";
import { getCheckoutState, clearCheckoutState } from "@/lib/checkout/cookie";
import { getSelectedCouponCode, setSelectedCouponCode } from "@/lib/cart/coupon-cookie";
import { validateCoupon } from "@/lib/cart/coupon";
import { groupSubtotal, computeCouponDiscount, getFreeDeliveryReason, round2 } from "@/lib/cart/totals";
import { getFreeDeliveryPromoSettingsUncached, isFirstOrderCustomer } from "@/lib/promotions/free-delivery";
import { getTobaccoSettings } from "@/lib/tobacco/queries";
import { toPoisha } from "@/lib/rider/ledger";
import { getRestaurantStatus } from "@/lib/restaurant/status";
import { recordAuditLog } from "@/lib/audit";
import { getPaymentAdapter } from "@/lib/payments/registry";
import { isPaymentMethodEnabled } from "@/lib/payments/method-settings";
import { getSiteSettingsUncached } from "@/lib/settings";
import { publicEnv } from "@/lib/env/public";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { formatVariantLabel } from "@/lib/catalog/variant-label";
import { ensureDefaultVariant } from "@/lib/catalog/variant-sync";
import type { ActionState } from "./types";
import type { PaymentProvider } from "@/generated/prisma/client";

export async function placeOrderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkout");

  const checkoutState = await getCheckoutState();
  if (!checkoutState.addressId || !checkoutState.paymentMethod) redirect("/checkout");

  const address = await db.address.findUnique({
    where: { id: checkoutState.addressId },
    include: { deliveryZone: true },
  });
  if (!address || address.userId !== user.id) return { status: "error", message: "Delivery address not found." };
  if (!address.deliveryZone || !address.deliveryZone.isActive) {
    return { status: "error", message: "This address is outside our active delivery coverage." };
  }

  const { groups } = await getFullCart(user.id);
  if (groups.length === 0) redirect("/cart");

  for (const group of groups) {
    if (group.lines.some((l) => !l.isAvailable)) {
      return { status: "error", message: `Some items from ${group.vendorBusinessName} are no longer available. Please update your cart.` };
    }
  }

  // Weekly grocery picks are batch-fulfilled — re-checked here (not just at
  // the schedule step) so this can't be skipped by resuming checkout mid-flow.
  if (groups.some((g) => g.lines.some((l) => l.isWeeklyGrocery))) {
    const scheduledDate = checkoutState.scheduledFor ? new Date(checkoutState.scheduledFor) : null;
    if (!scheduledDate || Number.isNaN(scheduledDate.getTime()) || scheduledDate.getTime() < Date.now() + 24 * 60 * 60 * 1000) {
      redirect("/checkout/schedule?error=advance_required");
    }
  }

  // Restaurant availability gate — closed restaurants only accept orders
  // when the customer explicitly scheduled for later and the restaurant
  // supports scheduled ordering.
  for (const group of groups) {
    if (group.vendorBusinessType !== "RESTAURANT") continue;
    const restaurant = await db.restaurant.findUnique({ where: { vendorId: group.vendorId }, include: { weeklyHours: true } });
    if (!restaurant) continue;
    const status = getRestaurantStatus(restaurant);
    const isScheduled = !!checkoutState.scheduledFor;
    if (!status.isOpenNow && !(isScheduled && status.canAcceptScheduledOrders)) {
      return { status: "error", message: `${group.vendorBusinessName} is currently closed and isn't accepting orders right now.` };
    }
  }

  const allLines = groups.flatMap((g) => g.lines);
  const subtotal = groupSubtotal(allLines.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity, addOnsTotal: l.addOnsTotal })));

  // Age-restricted items (cigarettes & smoking accessories) are sold at full
  // price like anything else, but never promoted — they never earn a coupon
  // discount and their presence in the cart voids free delivery for the
  // whole order. discountableSubtotal/discountableGroupSub below exclude
  // them from every discount calculation without changing what the item
  // itself, its commission, or vendor earnings are based on.
  const containsAgeRestricted = allLines.some((l) => l.isAgeRestricted);
  const discountableSubtotal = groupSubtotal(
    allLines.filter((l) => !l.isAgeRestricted).map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity, addOnsTotal: l.addOnsTotal })),
  );

  // Never trust the client on this — re-derived from the cart itself above,
  // not from whatever the form claims. The checkbox on the review page is
  // only required/rendered when this is true, but a tampered POST must be
  // rejected here regardless.
  const tobaccoSettings = containsAgeRestricted ? await getTobaccoSettings() : null;
  if (containsAgeRestricted && formData.get("ageConfirmed") !== "1") {
    return { status: "error", message: "Please confirm your age to order an age-restricted item." };
  }

  const couponCode = await getSelectedCouponCode();
  let totalDiscount = 0;
  let validatedCoupon: Awaited<ReturnType<typeof validateCoupon>> | null = null;
  if (couponCode) {
    validatedCoupon = await validateCoupon(couponCode, user.id, discountableSubtotal);
    if (validatedCoupon.ok) totalDiscount = computeCouponDiscount(discountableSubtotal, validatedCoupon.coupon);
  }

  // Uncached read — this is the actual charge, so it must never lag behind
  // the very latest admin-saved offer settings, even momentarily.
  const [freeDeliveryPromo, isFirstOrder] = await Promise.all([getFreeDeliveryPromoSettingsUncached(), isFirstOrderCustomer(user.id)]);
  const freeDeliveryReason = containsAgeRestricted ? null : getFreeDeliveryReason(subtotal, isFirstOrder, freeDeliveryPromo);
  const deliveryIsFree = freeDeliveryReason !== null;

  const zone = address.deliveryZone;
  const paymentMethod = checkoutState.paymentMethod as PaymentProvider;
  const scheduledFor = checkoutState.scheduledFor ? new Date(checkoutState.scheduledFor) : null;
  const locale = await getLocale();

  // Final, authoritative gate — selectPaymentMethodAction already checked
  // this when the method was picked, but checkout can sit open for a while
  // before review; re-check right before the real Payment row is created so
  // a method an admin disabled in between can never actually be charged.
  const paymentSettings = await getSiteSettingsUncached();
  if (!isPaymentMethodEnabled(paymentMethod, paymentSettings)) {
    return { status: "error", message: "Your selected payment method is no longer available. Please go back and choose another." };
  }

  try {
    const { orderGroup, payment, grandTotal } = await db.$transaction(async (tx) => {
      const orderGroupNumber = `PU-${Date.now()}`;

      let runningSubtotal = 0;
      let runningDeliveryFee = 0;
      const orderCreates: { vendorId: string; group: (typeof groups)[number]; groupSub: number; deliveryFee: number; discountShare: number }[] = [];

      for (const group of groups) {
        const groupSub = groupSubtotal(group.lines.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity, addOnsTotal: l.addOnsTotal })));
        const discountableGroupSub = groupSubtotal(
          group.lines.filter((l) => !l.isAgeRestricted).map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity, addOnsTotal: l.addOnsTotal })),
        );
        // Per-zone freeDeliveryThreshold is no longer used — free delivery is
        // decided entirely by the sitewide offers above; the zone only sets
        // the flat per-vendor fee amount when neither offer applies.
        const deliveryFee = deliveryIsFree ? 0 : round2(Number(zone.deliveryFee));
        // Proportioned against the discountable (non-age-restricted) totals
        // only, so an age-restricted line's own price never gets a share of
        // the coupon discount.
        const discountShare = discountableSubtotal > 0 ? round2((discountableGroupSub / discountableSubtotal) * totalDiscount) : 0;
        runningSubtotal += groupSub;
        runningDeliveryFee += deliveryFee;
        orderCreates.push({ vendorId: group.vendorId, group, groupSub, deliveryFee, discountShare });
      }

      const grandTotal = round2(runningSubtotal - totalDiscount + runningDeliveryFee);

      const createdOrderGroup = await tx.orderGroup.create({
        data: {
          groupNumber: orderGroupNumber,
          customerId: user.id,
          subtotal: runningSubtotal,
          deliveryFeeTotal: runningDeliveryFee,
          discountTotal: totalDiscount,
          grandTotal,
          couponCode: validatedCoupon?.ok ? validatedCoupon.coupon.code : null,
          scheduledFor,
        },
      });

      let orderIndex = 0;
      for (const item of orderCreates) {
        orderIndex += 1;
        const vendor = await tx.vendor.findUniqueOrThrow({ where: { id: item.vendorId } });
        const commissionRatePct = Number(vendor.commissionRatePct);
        const commissionAmount = round2(item.groupSub * (commissionRatePct / 100));
        const orderTotal = round2(item.groupSub - item.discountShare + item.deliveryFee);

        const order = await tx.order.create({
          data: {
            orderNumber: `${orderGroupNumber}-${orderIndex}`,
            orderGroupId: createdOrderGroup.id,
            customerId: user.id,
            vendorId: item.vendorId,
            addressId: address.id,
            deliveryZoneId: zone.id,
            status: "ORDER_PLACED",
            subtotal: item.groupSub,
            deliveryFee: item.deliveryFee,
            discount: item.discountShare,
            total: orderTotal,
            commissionRatePct,
            commissionAmount,
            vendorEarnings: round2(item.groupSub - commissionAmount),
            // Snapshot of the zone's standard fee right now — a rider's
            // delivery earning is always computed from this, never from
            // `deliveryFee` above (which may be reduced by a coupon/promo),
            // and never recomputed from a possibly-since-changed zone rate.
            standardDeliveryFeePoisha: toPoisha(Number(zone.deliveryFee)),
            scheduledFor,
            freeDeliveryReason: item.deliveryFee === 0 ? freeDeliveryReason : null,
            containsAgeRestrictedItems: item.group.lines.some((l) => l.isAgeRestricted),
          },
        });

        if (item.group.lines.some((l) => l.isAgeRestricted) && tobaccoSettings) {
          await tx.ageVerification.create({
            data: {
              orderId: order.id,
              customerId: user.id,
              // Not a real date of birth (never collected anywhere in this
              // app) — the latest birthdate consistent with the age the
              // customer just attested to at checkout, recorded as a
              // verifiable cutoff rather than fabricating a precise DOB.
              dateOfBirthOnFile: new Date(Date.now() - tobaccoSettings.minimumAge * 365.25 * 24 * 60 * 60 * 1000),
              confirmedAtCheckout: true,
              minimumAgeApplied: tobaccoSettings.minimumAge,
              result: "VERIFIED",
            },
          });
        }

        for (const line of item.group.lines) {
          // Self-heal: a product created by pre-variants code during the
          // deploy window could reach checkout with productId set but no
          // variantId — create the same default the backfill migration
          // would have rather than falling back to a legacy stock path.
          let effectiveVariantId = line.variantId;
          if (!effectiveVariantId && line.productId) {
            await ensureDefaultVariant(line.productId, tx);
            const healed = await tx.productVariant.findFirst({
              where: { productId: line.productId, isActive: true },
              orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
            });
            effectiveVariantId = healed?.id ?? null;
          }

          // line.variant (used for the name snapshot) already came back null
          // from getFullCart whenever the product has only one active option
          // — including this self-healed case — so a single-option product's
          // order line reads exactly like it did before variants existed.
          const nameSnapshot = line.variant ? `${line.name} — ${formatVariantLabel(line.variant, locale)}` : line.name;
          await tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: line.productId,
              variantId: effectiveVariantId,
              menuItemId: line.menuItemId,
              nameSnapshot,
              unitPriceSnapshot: line.unitPrice,
              quantity: line.quantity,
              selectedAddOns: line.selectedAddOns.length > 0 ? line.selectedAddOns : undefined,
              specialInstructions: line.specialInstructions,
              unavailableAction: line.unavailableAction,
              lineTotal: round2((line.unitPrice + line.addOnsTotal) * line.quantity),
            },
          });

          if (effectiveVariantId) {
            // Guarded decrement — if two checkouts race for the last units of
            // this variant, whichever commits second finds insufficient
            // stock here and the whole order rolls back (thrown below).
            const decremented = await tx.productVariant.updateMany({
              where: { id: effectiveVariantId, stockQty: { gte: line.quantity } },
              data: { stockQty: { decrement: line.quantity } },
            });
            if (decremented.count === 0) throw new Error(`INSUFFICIENT_STOCK:${line.name}`);

            // Inventory.quantityInStock is kept only as a maintained cache
            // (sum of active variant stock) for pre-existing admin/vendor
            // displays — the variant's own stockQty above is authoritative.
            if (line.productId) {
              const agg = await tx.productVariant.aggregate({
                where: { productId: line.productId, isActive: true },
                _sum: { stockQty: true },
              });
              await tx.inventory.updateMany({
                where: { productId: line.productId },
                data: { quantityInStock: agg._sum.stockQty ?? 0 },
              });
            }
          } else if (line.productId) {
            // Truly last-resort fallback — shouldn't be reachable now that
            // the self-heal above always creates a variant for a real product.
            await tx.inventory.updateMany({
              where: { productId: line.productId },
              data: { quantityInStock: { decrement: line.quantity } },
            });
          }
        }

        await tx.deliveryStatusHistory.create({ data: { orderId: order.id, status: "ORDER_PLACED", changedByUserId: user.id } });
        await tx.delivery.create({
          data: { orderId: order.id, pickupLat: vendor.lat, pickupLng: vendor.lng, dropLat: address.lat, dropLng: address.lng },
        });
        await tx.commissionEntry.create({
          data: { orderId: order.id, vendorId: item.vendorId, ratePct: commissionRatePct, commissionAmount, vendorEarnings: round2(item.groupSub - commissionAmount) },
        });
        await tx.notification.create({
          data: {
            userId: vendor.userId,
            type: "ORDER",
            title: "New order received",
            body: `Order ${order.orderNumber} — Tk ${orderTotal.toFixed(2)}, ${item.group.lines.length} item${item.group.lines.length === 1 ? "" : "s"}.`,
            linkUrl: `/vendor/orders/${order.id}`,
          },
        });

        if (item.discountShare > 0 && validatedCoupon?.ok) {
          await tx.couponRedemption.create({
            data: { couponId: validatedCoupon.coupon.id, orderId: order.id, discountApplied: item.discountShare },
          });
        }
      }

      const payment = await tx.payment.create({
        data: {
          orderGroupId: createdOrderGroup.id,
          provider: paymentMethod,
          amount: grandTotal,
          isSandbox: true,
        },
      });

      await tx.cartItem.deleteMany({ where: { cart: { userId: user.id } } });

      return { orderGroup: createdOrderGroup, payment, grandTotal };
    });

    await setSelectedCouponCode(null);
    await clearCheckoutState();
    await recordAuditLog({ actorUserId: user.id, action: "ORDER_PLACED", entityType: "OrderGroup", entityId: orderGroup.id, metadata: { grandTotal } });

    const adapter = getPaymentAdapter(paymentMethod);
    const confirmationUrl = `${publicEnv.appUrl}/checkout/confirmation/${orderGroup.id}`;

    const initiation = await adapter.createPayment({
      paymentId: payment.id,
      orderGroupId: orderGroup.id,
      amount: grandTotal,
      customerName: user.name,
      customerPhone: user.phone,
      customerEmail: user.email,
      returnUrl: confirmationUrl,
    });

    await db.payment.update({
      where: { id: payment.id },
      data: { providerRef: initiation.providerRef, isSandbox: adapter.isSandbox, status: paymentMethod === "COD" ? "PENDING" : "PROCESSING" },
    });

    redirect(initiation.redirectUrl);
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
    if (err instanceof Error && err.message.startsWith("INSUFFICIENT_STOCK:")) {
      const name = err.message.slice("INSUFFICIENT_STOCK:".length);
      return { status: "error", message: `"${name}" just sold out. Please update your cart and try again.` };
    }
    console.error("placeOrderAction failed:", err);
    return { status: "error", message: "We couldn't place your order. Please try again." };
  }
}
