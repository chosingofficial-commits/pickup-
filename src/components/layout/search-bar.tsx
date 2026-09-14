import { Search } from "lucide-react";

export function SearchBar({ placeholder, className }: { placeholder: string; className?: string }) {
  return (
    <form action="/marketplace" method="GET" role="search" className={className}>
      <label htmlFor="site-search" className="sr-only">
        {placeholder}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
        <input
          id="site-search"
          name="q"
          type="search"
          placeholder={placeholder}
          className="h-11 w-full rounded-control border border-border-brand bg-white pl-10 pr-4 text-sm text-brand-dark placeholder:text-gray-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        />
      </div>
    </form>
  );
}
