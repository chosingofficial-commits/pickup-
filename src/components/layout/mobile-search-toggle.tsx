"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mobile-only: a 44x44 search icon that expands into the same /marketplace?q=
 * GET form the desktop SearchBar uses. The expanded form is absolutely
 * positioned (anchored to the nearest positioned ancestor — the sticky
 * <header>) instead of pushing a new row, so it never forces the single-row
 * mobile header to wrap. Desktop never renders this — see header.tsx.
 */
export function MobileSearchToggle({ placeholder, className }: { placeholder: string; className?: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn("shrink-0", className)}>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label={placeholder}
        aria-expanded={expanded}
        className="flex h-11 w-11 items-center justify-center rounded-control text-brand-dark hover:bg-brand-bg"
      >
        <Search className="h-5 w-5" aria-hidden />
      </button>

      {expanded && (
        <form
          action="/marketplace"
          method="GET"
          role="search"
          className="absolute inset-x-4 top-full z-50 mt-2 flex items-center gap-1.5 rounded-control border border-border-brand bg-white p-2 shadow-lifted"
        >
          <label htmlFor="site-search-mobile" className="sr-only">
            {placeholder}
          </label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              id="site-search-mobile"
              name="q"
              type="search"
              autoFocus
              placeholder={placeholder}
              className="h-11 w-full rounded-control border border-border-brand bg-white pl-9 pr-3 text-sm text-brand-dark placeholder:text-gray-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            />
          </div>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Close search"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-brand-dark hover:bg-brand-bg"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </form>
      )}
    </div>
  );
}
