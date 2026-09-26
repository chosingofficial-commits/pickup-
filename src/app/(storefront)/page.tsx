import type { Metadata } from "next";
import Link from "next/link";
import { AnnouncementBar } from "@/components/home/announcement-bar";
import { HeroSection } from "@/components/home/hero-section";
import { CategoryGrid } from "@/components/home/category-grid";
import { ProductRail } from "@/components/home/product-rail";
import { FlashCountdown } from "@/components/home/flash-countdown";
import { HowItWorks } from "@/components/home/how-it-works";
import { VendorPromo } from "@/components/home/vendor-promo";
import { AppPromo } from "@/components/home/app-promo";
import { ReviewsSection } from "@/components/home/reviews-section";
import { CoverageSection } from "@/components/home/coverage-section";
import { NewsletterSection } from "@/components/home/newsletter-section";
import { RestaurantCard } from "@/components/restaurant/restaurant-card";
import { AdSlot } from "@/components/ads/ad-slot";
import { Section } from "@/components/ui/container";
import { JsonLd } from "@/components/seo/json-ld";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getShopCategories, getPopularProducts, getFlashDeals, getWeeklyGroceryPicks } from "@/lib/catalog/queries";
import { getPopularRestaurants } from "@/lib/restaurant/queries";
import { getActiveServiceAreaLabel, getOrderableNeighbourhoods } from "@/lib/location/queries";
import { getFeaturedReviews } from "@/lib/reviews/queries";
import { getSiteSettings, SITE_SETTING_KEYS } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth/session";
import { getFavoritedVendorIds } from "@/lib/favorites/queries";
import { publicEnv } from "@/lib/env/public";

export const metadata: Metadata = {
  title: "Groceries, essentials & restaurant food delivered fast",
  description:
    "Pick Up delivers groceries, everyday essentials, and restaurant food across Khagrachari Sadar. Browse local vendors and order online.",
};

export default async function HomePage() {
  const user = await getCurrentUser();
  const [{ dict }, areaLabel, categories, popularProducts, weeklyGroceryPicks, flashDeals, restaurants, neighbourhoods, reviews, settings, favoritedVendorIds] =
    await Promise.all([
      getDictionary(),
      getActiveServiceAreaLabel(),
      getShopCategories(),
      getPopularProducts(10),
      getWeeklyGroceryPicks(10),
      getFlashDeals(10),
      getPopularRestaurants(6),
      getOrderableNeighbourhoods(),
      getFeaturedReviews(6),
      getSiteSettings(),
      user ? getFavoritedVendorIds(user.id) : Promise.resolve(new Set<string>()),
    ]);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "Pick Up",
          description: "Pick Up delivers groceries, everyday essentials, and restaurant food across Khagrachari Sadar.",
          url: publicEnv.appUrl,
          areaServed: areaLabel ?? "Khagrachari Sadar",
          address: { "@type": "PostalAddress", addressLocality: "Khagrachari Sadar", addressCountry: "BD" },
          priceRange: "৳",
        }}
      />
      <AnnouncementBar message="🎉 Free delivery on your first order over ৳500 in Khagrachari Sadar!" />

      <HeroSection
        areaLabel={areaLabel}
        title={dict.home.heroTitle}
        subtitle={dict.home.heroSubtitle}
        cta={dict.home.heroCta}
        imageUrl={settings[SITE_SETTING_KEYS.heroImageUrl]}
      />

      <AdSlot code="HERO_BANNER" className="mx-4 -mt-4 sm:mx-6 lg:mx-8" aspect="aspect-[3/1] lg:aspect-[5/1]" />

      <Section title={dict.home.categoriesTitle}>
        <CategoryGrid categories={categories} />
      </Section>

      <AdSlot code="BELOW_CATEGORIES_BANNER" className="mx-4 sm:mx-6 lg:mx-8" />

      <Section
        title={dict.home.popularProductsTitle}
        action={
          <Link href="/marketplace" className="text-sm font-semibold text-brand-primary hover:underline">
            {dict.common.viewAll}
          </Link>
        }
      >
        <ProductRail products={popularProducts} />
      </Section>

      {weeklyGroceryPicks.length > 0 && (
        <Section title={dict.home.weeklyGroceryTitle} subtitle="Batch-fulfilled — orders with these items are scheduled at least 24 hours ahead.">
          <ProductRail products={weeklyGroceryPicks} />
        </Section>
      )}

      <div className="md:hidden">
        <AdSlot code="MOBILE_PROMO_CARD" className="mx-4" aspect="aspect-[2/1]" />
      </div>

      {flashDeals.length > 0 && (
        <Section
          title={
            <span className="flex items-center gap-3">
              {dict.home.flashDealsTitle}
              <FlashCountdown />
            </span>
          }
        >
          <ProductRail products={flashDeals} />
        </Section>
      )}

      <AdSlot code="BETWEEN_SECTIONS_BANNER" className="mx-4 sm:mx-6 lg:mx-8" />

      {restaurants.length > 0 && (
        <Section
          title={dict.home.popularRestaurantsTitle}
          action={
            <Link href="/restaurants" className="text-sm font-semibold text-brand-primary hover:underline">
              {dict.common.viewAll}
            </Link>
          }
        >
          <AdSlot code="RESTAURANT_PROMO_BANNER" className="mb-4" aspect="aspect-[4/1]" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AdSlot code="SPONSORED_RESTAURANT" variant="card" aspect="aspect-[16/9]" />
            {restaurants.map((vendor) => (
              <RestaurantCard key={vendor.id} vendor={vendor} isFavorited={favoritedVendorIds.has(vendor.id)} />
            ))}
          </div>
        </Section>
      )}

      <Section title={dict.home.specialOffersTitle}>
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdSlot code="SPONSORED_VENDOR" variant="card" aspect="aspect-[16/9]" />
            <VendorPromo title={dict.home.vendorPromoTitle} body={dict.home.vendorPromoBody} cta={dict.home.vendorPromoCta} />
          </div>
          <div className="hidden lg:block">
            <AdSlot code="SIDEBAR_BANNER" aspect="aspect-[1/2]" className="h-full" />
          </div>
        </div>
      </Section>

      <Section title={dict.home.howItWorksTitle}>
        <HowItWorks />
      </Section>

      <Section>
        <AppPromo />
      </Section>

      {reviews.length > 0 && (
        <Section title={dict.home.reviewsTitle}>
          <ReviewsSection reviews={reviews} />
        </Section>
      )}

      <Section title={dict.home.coverageTitle}>
        <CoverageSection neighbourhoods={neighbourhoods} />
      </Section>

      <Section>
        <NewsletterSection title={dict.home.newsletterTitle} body={dict.home.newsletterBody} cta={dict.home.newsletterCta} />
      </Section>
    </>
  );
}
