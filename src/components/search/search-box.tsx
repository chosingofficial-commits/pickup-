"use client";

import { Search, X } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * Debounced search box that keeps the query in the URL (?q=) so results are
 * shareable and the back button works. Preserves every other existing
 * search param on the current page (category, sort, shopType, cuisine,
 * etc.) and resets pagination to page 1 on a new search. A new convention
 * for this codebase — every other filter control here submits a full GET
 * form instead; this one updates live because results need to update while
 * typing. Must be rendered inside a <Suspense> boundary (uses
 * useSearchParams).
 */
export function SearchBox({ placeholder, className }: { placeholder: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q") ?? "";
  const [value, setValue] = useState(urlQ);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stay in sync when the URL's q changes from elsewhere — back/forward
  // navigation, a filter form resubmitting with the existing q passed
  // through via its hidden input, a "popular category" suggestion link, etc.
  // Adjusted during render against the previously-seen value (not in an
  // effect, which would cost an extra render round-trip) — same pattern
  // used for the vendor-application wizard's own state-reset-on-prop-change.
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ);
  if (urlQ !== prevUrlQ) {
    setPrevUrlQ(urlQ);
    setValue(urlQ);
  }

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  function navigate(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.trim()) params.set("q", next);
    else params.delete("q");
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => navigate(next), 350);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    navigate(value);
  }

  function handleClear() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setValue("");
    navigate("");
  }

  return (
    <form role="search" onSubmit={handleSubmit} className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-control border border-border-brand bg-white pl-10 pr-9 text-sm text-brand-dark placeholder:text-gray-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </form>
  );
}
