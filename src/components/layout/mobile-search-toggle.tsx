"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mobile-only: a 44x44 search icon that expands in place into the same
 * /marketplace?q= GET form the desktop SearchBar uses, instead of permanently
 * reserving a full row for it (the biggest single contributor to the old
 * mobile header's height). Desktop never renders this — see header.tsx.
 */
export function MobileSearchToggle({ placeholder, className }: { placeholder: string; className?: string }) {
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return (
      <form action="/marketplace" method="GET" role="search" className={cn("order-last flex w-full items-center gap-1.5", className)}>
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
    );
  }

  return (
    <button
      type="button"
      onClick={() => setExpanded(true)}
      aria-label={placeholder}
      className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-brand-dark hover:bg-brand-bg", className)}
    >
      <Search className="h-5 w-5" aria-hidden />
    </button>
  );
}
