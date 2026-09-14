import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";

export function VendorPromo({ title, body, cta }: { title: string; body: string; cta: string }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-card bg-brand-dark p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10">
          <Store className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <h2 className="font-heading text-xl font-bold">{title}</h2>
          <p className="mt-1 max-w-md text-sm text-white/75">{body}</p>
        </div>
      </div>
      <Link
        href="/vendor/register"
        className="inline-flex shrink-0 items-center gap-2 rounded-control bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover"
      >
        {cta}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
