import Link from "next/link";
import { CategoryIcon } from "./category-icon";
import type { getShopCategories } from "@/lib/catalog/queries";

export function CategoryGrid({ categories }: { categories: Awaited<ReturnType<typeof getShopCategories>> }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/marketplace?category=${category.slug}`}
          className="group flex flex-col items-center gap-2 rounded-card border border-border-brand bg-white p-4 text-center shadow-soft transition-transform hover:-translate-y-0.5 hover:shadow-lifted"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-bg text-brand-primary group-hover:bg-brand-accent/50">
            <CategoryIcon name={category.icon} className="h-6 w-6" />
          </span>
          <span className="text-xs font-semibold text-brand-dark sm:text-sm">{category.name}</span>
        </Link>
      ))}
      <Link
        href="/restaurants"
        className="group flex flex-col items-center gap-2 rounded-card border border-border-brand bg-white p-4 text-center shadow-soft transition-transform hover:-translate-y-0.5 hover:shadow-lifted"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-bg text-brand-primary group-hover:bg-brand-accent/50">
          <span className="text-xl" aria-hidden>
            🍛
          </span>
        </span>
        <span className="text-xs font-semibold text-brand-dark sm:text-sm">Restaurants</span>
      </Link>
    </div>
  );
}
