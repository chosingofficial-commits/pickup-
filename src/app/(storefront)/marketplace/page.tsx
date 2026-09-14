import type { Metadata } from "next";
import { Section } from "@/components/ui/container";
import { ProductCard } from "@/components/product/product-card";
import { MarketplaceFiltersForm } from "@/components/product/marketplace-filters";
import { Pagination } from "@/components/ui/pagination";
import { getMarketplaceProducts, getAllShoppableCategories } from "@/lib/catalog/queries";
import type { MarketplaceFilters } from "@/lib/catalog/queries";
import { isTobaccoModuleEnabled, matchesTobaccoSearchQuery } from "@/lib/tobacco/queries";
import { TobaccoSearchBanner } from "@/components/tobacco/search-banner";

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Browse groceries, everyday essentials, household products, and personal care from Pick Up vendors in Khagrachari Sadar.",
};

type SearchParams = Record<string, string | string[] | undefined>;

function toStr(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function parseFilters(sp: SearchParams): MarketplaceFilters {
  const page = Number(toStr(sp.page) ?? "1");
  return {
    categorySlug: toStr(sp.category),
    q: toStr(sp.q),
    minPrice: toStr(sp.minPrice) ? Number(toStr(sp.minPrice)) : undefined,
    maxPrice: toStr(sp.maxPrice) ? Number(toStr(sp.maxPrice)) : undefined,
    minRating: toStr(sp.minRating) ? Number(toStr(sp.minRating)) : undefined,
    sort: (toStr(sp.sort) as MarketplaceFilters["sort"]) ?? "relevance",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function buildHref(filters: MarketplaceFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.categorySlug) params.set("category", filters.categorySlug);
  if (filters.q) params.set("q", filters.q);
  if (filters.minPrice != null) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice != null) params.set("maxPrice", String(filters.maxPrice));
  if (filters.minRating != null) params.set("minRating", String(filters.minRating));
  if (filters.sort) params.set("sort", filters.sort);
  params.set("page", String(page));
  return `/marketplace?${params.toString()}`;
}

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);

  const [categories, result, showTobaccoBanner] = await Promise.all([
    getAllShoppableCategories(),
    getMarketplaceProducts(filters),
    filters.q && matchesTobaccoSearchQuery(filters.q) ? isTobaccoModuleEnabled() : Promise.resolve(false),
  ]);

  const activeCategory = categories.find((c) => c.slug === filters.categorySlug);

  return (
    <Section
      title={activeCategory ? activeCategory.name : filters.q ? `Search results for "${filters.q}"` : "Marketplace"}
      subtitle={`${result.total} product${result.total === 1 ? "" : "s"} available`}
    >
      <div className="mb-6">
        <MarketplaceFiltersForm categories={categories} filters={filters} />
      </div>

      {showTobaccoBanner && <TobaccoSearchBanner />}

      {result.items.length === 0 ? (
        <div className="rounded-card border border-border-brand bg-white p-10 text-center">
          <p className="font-heading text-lg font-bold text-brand-dark">No products found</p>
          <p className="mt-1 text-sm text-gray-600">Try adjusting your filters or search for something else.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {result.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Pagination page={result.page} totalPages={result.totalPages} buildHref={(p) => buildHref(filters, p)} />
        </>
      )}
    </Section>
  );
}
