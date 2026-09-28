import Link from "next/link";
import { Heart, ShoppingCart, UserRound, Store } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "./search-bar";
import { MobileSearchToggle } from "./mobile-search-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { MobileLanguageToggle } from "./mobile-language-toggle";
import { LocationSelector } from "@/components/location/location-selector";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getCurrentUser } from "@/lib/auth/session";
import { getCartItemCount, getWishlistItemCount } from "@/lib/cart/queries";
import { getSelectedLocation } from "@/lib/location/cookie";
import { getOrderableNeighbourhoods } from "@/lib/location/queries";
import { logoutAction } from "@/lib/actions/auth";

const NAV_LINKS = [
  { href: "/marketplace?category=groceries", labelKey: "groceries" as const },
  { href: "/restaurants", labelKey: "restaurants" as const },
  { href: "/marketplace?category=everyday-essentials", labelKey: "essentials" as const },
  { href: "/marketplace?category=household-products", labelKey: "household" as const },
  { href: "/marketplace?category=personal-care", labelKey: "personalCare" as const },
];

export async function Header() {
  // Cart/wishlist counts only depend on the user, not on dictionary/location —
  // chain them off the same user promise instead of waiting for an entire
  // first round of fetches to finish before starting a second one. Header
  // renders on every page, so this round-trip was paid on every navigation.
  const userPromise = getCurrentUser();
  const [{ dict }, user, selectedLocation, neighbourhoods, cartCount, wishlistCount] = await Promise.all([
    getDictionary(),
    userPromise,
    getSelectedLocation(),
    getOrderableNeighbourhoods(),
    userPromise.then((u) => getCartItemCount(u?.id)),
    userPromise.then((u) => getWishlistItemCount(u?.id)),
  ]);

  const neighbourhoodOptions = neighbourhoods.map((n) => ({ id: n.id, name: n.name, townName: n.town.name }));
  const accountHref = !user
    ? "/login"
    : user.role === "ADMIN"
      ? "/admin"
      : user.role === "VENDOR"
        ? "/vendor"
        : user.role === "RIDER"
          ? "/rider"
          : "/account";

  return (
    <header className="sticky top-0 z-40 border-b border-border-brand bg-white/95 backdrop-blur">
      {/*
        Mobile (<md): a single non-wrapping row — logo, location (flexible,
        truncates), search icon, language toggle, cart — entirely separate
        markup from desktop below, so desktop can't regress from anything
        done here. No account icon here: the bottom MobileNav tab bar already
        has "Account", so the row gives that space to the location label
        instead. See mobile-search-toggle.tsx / mobile-language-toggle.tsx.
      */}
      <Container className="relative flex flex-nowrap items-center gap-1 py-2 md:hidden">
        <Link href="/" prefetch={false} className="flex h-11 w-11 shrink-0 items-center justify-center">
          <Logo size="sm" iconOnly />
        </Link>

        <LocationSelector
          neighbourhoods={neighbourhoodOptions}
          initialSelection={selectedLocation}
          shortLabel
          triggerClassName="min-h-11 min-w-0 flex-1 gap-1 px-2"
        />

        <MobileSearchToggle placeholder={dict.nav.search} />
        <MobileLanguageToggle />

        <Link
          href="/cart"
          prefetch={false}
          aria-label={dict.nav.cart}
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-brand-dark hover:bg-brand-bg"
        >
          <ShoppingCart className="h-5 w-5" aria-hidden />
          {cartCount > 0 && (
            <Badge variant="brand" className="absolute -right-1 -top-1 min-w-[18px] justify-center px-1 py-0 text-[10px]">
              {cartCount}
            </Badge>
          )}
        </Link>
      </Container>

      {/* Desktop (>=md): unchanged from the original header — verified pixel-identical at 1280px. */}
      <Container className="hidden flex-wrap items-center gap-3 py-3 md:flex">
        <Link href="/" prefetch={false} className="shrink-0">
          <Logo />
        </Link>

        <LocationSelector neighbourhoods={neighbourhoodOptions} initialSelection={selectedLocation} triggerClassName="max-w-[280px]" />

        <SearchBar placeholder={dict.nav.search} className="order-none flex-1" />

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />

          <Link href="/account/wishlist" prefetch={false} aria-label={dict.nav.wishlist} className="relative rounded-control p-2.5 text-brand-dark hover:bg-brand-bg">
            <Heart className="h-5 w-5" aria-hidden />
            {wishlistCount > 0 && (
              <Badge variant="brand" className="absolute -right-1 -top-1 min-w-[18px] justify-center px-1 py-0 text-[10px]">
                {wishlistCount}
              </Badge>
            )}
          </Link>

          <Link href="/cart" prefetch={false} aria-label={dict.nav.cart} className="relative rounded-control p-2.5 text-brand-dark hover:bg-brand-bg">
            <ShoppingCart className="h-5 w-5" aria-hidden />
            {cartCount > 0 && (
              <Badge variant="brand" className="absolute -right-1 -top-1 min-w-[18px] justify-center px-1 py-0 text-[10px]">
                {cartCount}
              </Badge>
            )}
          </Link>

          {user ? (
            <div className="flex items-center gap-1.5">
              <Link
                href={accountHref}
                prefetch={false}
                className="flex items-center gap-1.5 rounded-control px-3 py-2 text-sm font-medium text-brand-dark hover:bg-brand-bg"
              >
                <UserRound className="h-4 w-4" aria-hidden />
                {user.name.split(" ")[0]}
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="rounded-control px-3 py-2 text-sm font-medium text-brand-dark hover:bg-brand-bg">
                  {dict.nav.logout}
                </button>
              </form>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link href="/login" prefetch={false} className="rounded-control px-3 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-bg">
                {dict.nav.login}
              </Link>
              <Link
                href="/register"
                prefetch={false}
                className="rounded-control bg-brand-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-hover"
              >
                {dict.nav.signup}
              </Link>
            </div>
          )}
        </div>
      </Container>

      <nav aria-label="Categories" className="border-t border-border-brand bg-brand-bg/60">
        <Container className="flex items-center gap-4 overflow-x-auto text-xs font-medium text-brand-dark [scrollbar-width:none] [-ms-overflow-style:none] md:gap-6 md:overflow-visible md:py-2 md:text-sm [&::-webkit-scrollbar]:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              className="shrink-0 whitespace-nowrap py-3.5 hover:text-brand-primary md:shrink md:py-0"
            >
              {dict.nav[link.labelKey]}
            </Link>
          ))}
          <Link
            href="/vendor/register"
            prefetch={false}
            className="ml-auto flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap font-semibold text-brand-primary hover:text-brand-primary-hover md:min-h-0"
          >
            <Store className="h-4 w-4" aria-hidden />
            {dict.nav.becomeVendor}
          </Link>
        </Container>
      </nav>
    </header>
  );
}
