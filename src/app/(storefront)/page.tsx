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
import { AdCarouselSection } from "@/components/ads/ad-carousel-section";
import { Section } from "@/components/ui/container";
import { JsonLd } from "@/components/seo/json-ld";
import { getDictionary, t } from "@/lib/i18n/get-dictionary";
import { getFreeDeliveryPromoSettings } from "@/lib/promotions/free-delivery";
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
  // getCurrentUser() is only needed here to scope favoritedVendorIds to the
  // signed-in visitor — chain off the same promise instead of awaiting it
  // up front, so it runs alongside the other independent queries rather
  // than serializing in front of them.
  const userPromise = getCurrentUser();
  const [
    { dict, locale },
    areaLabel,
    categories,
    popularProducts,
    weeklyGroceryPicks,
    flashDeals,
    restaurants,
    neighbourhoods,
    reviews,
    settings,
    freeDeliveryPromo,
    favoritedVendorIds,
  ] = await Promise.all([
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
    getFreeDeliveryPromoSettings(),
    userPromise.then((user) => (user ? getFavoritedVendorIds(user.id) : new Set<string>())),
  ]);

  // Banner shows whichever offers are actively advertised (admin toggle, not
  // per-visitor eligibility — that's checked separately at checkout). The
  // all-orders offer's banner text is optional, so it may contribute nothing
  // here even while still applying the discount.
  const freeDeliveryMessages = [
    freeDeliveryPromo.firstOrder.enabled
      ? t(locale === "bn" ? freeDeliveryPromo.firstOrder.bannerTextBn : freeDeliveryPromo.firstOrder.bannerTextEn, {
          amount: freeDeliveryPromo.firstOrder.minOrderAmount,
        })
      : null,
    freeDeliveryPromo.allOrders.enabled && (locale === "bn" ? freeDeliveryPromo.allOrders.bannerTextBn : freeDeliveryPromo.allOrders.bannerTextEn).trim()
      ? t(locale === "bn" ? freeDeliveryPromo.allOrders.bannerTextBn : freeDeliveryPromo.allOrders.bannerTextEn, {
          amount: freeDeliveryPromo.allOrders.minOrderAmount,
        })
      : null,
  ].filter((m): m is string => !!m);
  const freeDeliveryBannerMessage = freeDeliveryMessages.length > 0 ? freeDeliveryMessages.join("  ·  ") : null;

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
          priceRange: "Tk",
        }}
      />
      {freeDeliveryBannerMessage && <AnnouncementBar message={freeDeliveryBannerMessage} versionKey={freeDeliveryPromo.versionKey} />}

      <HeroSection
        areaLabel={areaLabel}
        title={dict.home.heroTitle}
        subtitle={dict.home.heroSubtitle}
        cta={dict.home.heroCta}
        imageUrl={settings[SITE_SETTING_KEYS.heroImageUrl]}
      />

      <AdCarouselSection placementCode="HOMEPAGE_CAROUSEL" className="-mt-4" />

      <Section title={dict.home.categoriesTitle}>
        <CategoryGrid categories={categories} />
      </Section>

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

      {restaurants.length > 0 && (
        <Section
          title={dict.home.popularRestaurantsTitle}
          action={
            <Link href="/restaurants" className="text-sm font-semibold text-brand-primary hover:underline">
              {dict.common.viewAll}
            </Link>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((vendor) => (
              <RestaurantCard key={vendor.id} vendor={vendor} isFavorited={favoritedVendorIds.has(vendor.id)} />
            ))}
          </div>
        </Section>
      )}

      <Section title={dict.home.specialOffersTitle}>
        <VendorPromo title={dict.home.vendorPromoTitle} body={dict.home.vendorPromoBody} cta={dict.home.vendorPromoCta} />
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
