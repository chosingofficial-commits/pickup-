import Link from "next/link";
import { MapPin } from "lucide-react";

export function CoverageSection({ neighbourhoods }: { neighbourhoods: { id: string; name: string }[] }) {
  return (
    <div className="rounded-card border border-border-brand bg-white p-6 shadow-soft">
      <p className="mb-3 text-sm text-gray-600">We currently deliver to these areas in Khagrachari Sadar:</p>
      <ul className="flex flex-wrap gap-2">
        {neighbourhoods.map((n) => (
          <li
            key={n.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-bg px-3 py-1.5 text-xs font-medium text-brand-dark"
          >
            <MapPin className="h-3.5 w-3.5 text-brand-primary" aria-hidden />
            {n.name}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-gray-600">
        Outside these areas?{" "}
        <Link href="/coverage" className="font-semibold text-brand-primary hover:underline">
          Join the waiting list
        </Link>{" "}
        and we&apos;ll notify you as Pick Up expands.
      </p>
    </div>
  );
}
