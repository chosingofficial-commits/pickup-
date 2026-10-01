"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getFullCart } from "@/lib/cart/queries";
import { getCheckoutState, clearCheckoutState } from "@/lib/checkout/cookie";
import { getSelectedCouponCode, setSelectedCouponCode } from "@/lib/cart/coupon-cookie";
import { validateCoupon } from "@/lib/cart/coupon";
import { groupSubtotal, computeCouponDiscount, freeDeliveryApplies, round2 } from "@/lib/cart/totals";
import { getFreeDeliveryPromoSettingsUncached, isFirstOrderCustomer } from "@/lib/promotions/free-delivery";
import { toPoisha } from "@/lib/rider/ledger";
import { getRestaurantStatus } from "@/lib/restaurant/status";
import { recordAuditLog } from "@/lib/audit";
import { getPaymentAdapter } from "@/lib/payments/registry";
import { publicEnv } from "@/lib/env/public";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { formatVariantLabel } from "@/lib/catalog/variant-label";
import type { ActionState } from "./types";
import type { PaymentProvider } from "@/generated/prisma/client";

export async function placeOrderAction(_prev: ActionState, _formData: FormData): Promise<ActionState> {
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

  const subtotal = groupSubtotal(
    groups.flatMap((g) => g.lines.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity, addOnsTotal: l.addOnsTotal }))),
  );

  const couponCode = await getSelectedCouponCode();
  let totalDiscount = 0;
  let validatedCoupon: Awaited<ReturnType<typeof validateCoupon>> | null = null;
  if (couponCode) {
    validatedCoupon = await validateCoupon(couponCode, user.id, subtotal);
    if (validatedCoupon.ok) totalDiscount = computeCouponDiscount(subtotal, validatedCoupon.coupon);
  }

  // Uncached read — this is the actual charge, so it must never lag behind
  // the very latest admin-saved offer settings, even momentarily.
  const [freeDeliveryPromo, isFirstOrder] = await Promise.all([getFreeDeliveryPromoSettingsUncached(), isFirstOrderCustomer(user.id)]);
  const deliveryIsFree = freeDeliveryApplies(subtotal, isFirstOrder, freeDeliveryPromo);

  const zone = address.deliveryZone;
  const paymentMethod = checkoutState.paymentMethod as PaymentProvider;
  const scheduledFor = checkoutState.scheduledFor ? new Date(checkoutState.scheduledFor) : null;
  const locale = await getLocale();

  try {
    const { orderGroup, payment, grandTotal } = await db.$transaction(async (tx) => {
      const orderGroupNumber = `PU-${Date.now()}`;

      let runningSubtotal = 0;
      let runningDeliveryFee = 0;
      const orderCreates: { vendorId: string; group: (typeof groups)[number]; groupSub: number; deliveryFee: number; discountShare: number }[] = [];

      for (const group of groups) {
        const groupSub = groupSubtotal(group.lines.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity, addOnsTotal: l.addOnsTotal })));
        // Per-zone freeDeliveryThreshold is no longer used — free delivery is
        // decided entirely by the sitewide offers above; the zone only sets
        // the flat per-vendor fee amount when neither offer applies.
        const deliveryFee = deliveryIsFree ? 0 : round2(Number(zone.deliveryFee));
        const discountShare = subtotal > 0 ? round2((groupSub / subtotal) * totalDiscount) : 0;
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
          },
        });

        for (const line of item.group.lines) {
          const nameSnapshot = line.variant ? `${line.name} — ${formatVariantLabel(line.variant, locale)}` : line.name;
          await tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: line.productId,
              variantId: line.variantId,
              menuItemId: line.menuItemId,
              nameSnapshot,
              unitPriceSnapshot: line.unitPrice,
              quantity: line.quantity,
              selectedAddOns: line.selectedAddOns.length > 0 ? line.selectedAddOns : undefined,
              specialInstructions: line.specialInstructions,
              lineTotal: round2((line.unitPrice + line.addOnsTotal) * line.quantity),
            },
          });

          if (line.variantId) {
            // Guarded decrement — if two checkouts race for the last units of
            // this variant, whichever commits second finds insufficient
            // stock here and the whole order rolls back (thrown below).
            const decremented = await tx.productVariant.updateMany({
              where: { id: line.variantId, stockQty: { gte: line.quantity } },
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
            // Defensive fallback — shouldn't happen once every product has a
            // variant (see the backfill migration), but keeps working if it did.
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
