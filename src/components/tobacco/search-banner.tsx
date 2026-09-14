import Link from "next/link";
import { ShieldAlert, ArrowRight } from "lucide-react";

export function TobaccoSearchBanner() {
  return (
    <Link
      href="/cigarettes"
      className="mb-6 flex items-center gap-3 rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-800 hover:bg-red-100"
    >
      <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden />
      <span className="flex-1">Age-restricted products (18+) are kept in a separate section.</span>
      <span className="flex shrink-0 items-center gap-1 font-semibold">
        View section <ArrowRight className="h-4 w-4" aria-hidden />
      </span>
    </Link>
  );
}
