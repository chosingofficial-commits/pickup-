import Link from "next/link";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1.5">
      <Link
        href={buildHref(Math.max(1, page - 1))}
        aria-disabled={page === 1}
        className={cn(
          "rounded-control border border-border-brand px-3 py-2 text-sm font-medium",
          page === 1 ? "pointer-events-none text-gray-300" : "text-brand-dark hover:bg-brand-bg",
        )}
      >
        Prev
      </Link>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && pages[i - 1]! < p - 1 && <span className="px-1 text-gray-400">…</span>}
          <Link
            href={buildHref(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              "rounded-control px-3 py-2 text-sm font-medium",
              p === page ? "bg-brand-primary text-white" : "text-brand-dark hover:bg-brand-bg",
            )}
          >
            {p}
          </Link>
        </span>
      ))}
      <Link
        href={buildHref(Math.min(totalPages, page + 1))}
        aria-disabled={page === totalPages}
        className={cn(
          "rounded-control border border-border-brand px-3 py-2 text-sm font-medium",
          page === totalPages ? "pointer-events-none text-gray-300" : "text-brand-dark hover:bg-brand-bg",
        )}
      >
        Next
      </Link>
    </nav>
  );
}
