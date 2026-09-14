import { notFound } from "next/navigation";
import { FlaskConical, CheckCircle2, XCircle } from "lucide-react";
import { Container } from "@/components/ui/container";
import { db } from "@/lib/db";
import { resolveMockPaymentAction } from "@/lib/actions/payments";
import { formatBDT } from "@/lib/utils";

export const metadata = { title: "Sandbox payment" };

export default async function MockPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ paymentId: string }>;
  searchParams: Promise<{ returnUrl?: string }>;
}) {
  const { paymentId } = await params;
  const { returnUrl } = await searchParams;
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment || !payment.isSandbox) notFound();

  const safeReturnUrl = returnUrl && returnUrl.startsWith("/") ? returnUrl : "/checkout";

  return (
    <Container className="flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-sm rounded-card border-2 border-dashed border-brand-primary bg-white p-6 text-center shadow-lifted">
        <FlaskConical className="mx-auto h-10 w-10 text-brand-primary" aria-hidden />
        <h1 className="mt-3 font-heading text-lg font-bold text-brand-dark">Sandbox Payment</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-amber-600">
          No real money will move — {payment.provider} test mode
        </p>
        <p className="mt-4 text-2xl font-bold text-brand-dark">{formatBDT(payment.amount)}</p>
        <p className="mt-1 text-xs text-gray-500">
          This screen stands in for {payment.provider}&apos;s real checkout page while merchant credentials aren&apos;t
          configured. See README &quot;Payments&quot; to connect real credentials.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <form action={resolveMockPaymentAction}>
            <input type="hidden" name="paymentId" value={payment.id} />
            <input type="hidden" name="outcome" value="approve" />
            <input type="hidden" name="returnUrl" value={safeReturnUrl} />
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-control bg-brand-primary py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Simulate successful payment
            </button>
          </form>
          <form action={resolveMockPaymentAction}>
            <input type="hidden" name="paymentId" value={payment.id} />
            <input type="hidden" name="outcome" value="decline" />
            <input type="hidden" name="returnUrl" value={safeReturnUrl} />
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-control border border-border-brand py-3 text-sm font-semibold text-brand-dark hover:bg-brand-bg"
            >
              <XCircle className="h-4 w-4" aria-hidden />
              Simulate failed payment
            </button>
          </form>
        </div>
      </div>
    </Container>
  );
}
