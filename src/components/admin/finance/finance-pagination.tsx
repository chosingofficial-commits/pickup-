import Link from "next/link";

/**
 * This page has three independently-paginated sections (refunds, per-vendor
 * commission, per-rider commission) sharing one URL — `pageParam` is which
 * query-string key this instance controls, so paging one section never
 * resets another or the date filter.
 */
export function FinancePagination({
  page,
  totalPages,
  totalCount,
  itemLabel,
  pageParam,
  currentParams,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  itemLabel: string;
  pageParam: string;
  currentParams: URLSearchParams;
}) {
  if (totalPages <= 1) return null;

  const hrefFor = (targetPage: number) => {
    const params = new URLSearchParams(currentParams);
    params.set(pageParam, String(targetPage));
    return `/admin/finance?${params.toString()}`;
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-gray-500">
        {totalCount} {itemLabel}
        {totalCount === 1 ? "" : "s"} · page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Link
          href={hrefFor(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={`rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold ${page <= 1 ? "pointer-events-none text-gray-300" : "text-brand-dark hover:bg-brand-bg"}`}
        >
          Previous
        </Link>
        <Link
          href={hrefFor(Math.min(totalPages, page + 1))}
          aria-disabled={page >= totalPages}
          className={`rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold ${page >= totalPages ? "pointer-events-none text-gray-300" : "text-brand-dark hover:bg-brand-bg"}`}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
