import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getPaymentAdapter } from "@/lib/payments/registry";
import { recordAuditLog } from "@/lib/audit";
import type { PaymentProvider } from "@/generated/prisma/client";

const VALID_PROVIDERS: PaymentProvider[] = ["BKASH", "NAGAD", "ROCKET", "SSLCOMMERZ", "CARD"];

/**
 * Generic inbound webhook for gateway callbacks (e.g. SSLCommerz IPN,
 * bKash server-to-server notification). Always re-verifies with the
 * provider server-side before trusting the payload, and is idempotent —
 * replayed webhooks for an already-settled payment are a no-op.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerParam } = await params;
  const provider = providerParam.toUpperCase() as PaymentProvider;
  if (!VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  const payload: Record<string, string> = contentType.includes("application/json")
    ? await req.json()
    : Object.fromEntries((await req.formData()).entries()) as Record<string, string>;

  const providerRef = payload.val_id ?? payload.paymentID ?? payload.providerRef ?? payload.tran_id;
  if (!providerRef) return NextResponse.json({ error: "Missing provider reference" }, { status: 400 });

  const payment = await db.payment.findFirst({ where: { providerRef, provider } });
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  // Idempotency: a payment already settled never gets re-processed by a replayed webhook.
  if (payment.status === "PAID" || payment.status === "REFUNDED") {
    return NextResponse.json({ ok: true, alreadySettled: true });
  }

  try {
    const adapter = getPaymentAdapter(provider);
    const result = await adapter.verifyPayment(providerRef);

    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: result.status,
        paidAt: result.status === "PAID" ? new Date() : payment.paidAt,
        rawPayload: JSON.parse(JSON.stringify(result.rawPayload ?? payload)),
      },
    });
    await db.transaction.create({
      data: { paymentId: payment.id, type: "charge", amount: payment.amount, status: result.status, metadata: payload },
    });
    await recordAuditLog({ action: "PAYMENT_WEBHOOK_PROCESSED", entityType: "Payment", entityId: payment.id, metadata: { provider, status: result.status } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`Payment webhook error (${provider}):`, err);
    return NextResponse.json({ error: "Verification failed" }, { status: 502 });
  }
}
