import Link from "next/link";
import { Heart, ShoppingCart, UserRound, Store } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "./search-bar";
import { LanguageSwitcher } from "./language-switcher";
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
  const [{ dict }, user, selectedLocation, neighbourhoods] = await Promise.all([
    getDictionary(),
    getCurrentUser(),
    getSelectedLocation(),
    getOrderableNeighbourhoods(),
  ]);

  const [cartCount, wishlistCount] = await Promise.all([
    getCartItemCount(user?.id),
    getWishlistItemCount(user?.id),
  ]);

  const neighbourhoodOptions = neighbourhoods.map((n) => ({ id: n.id, name: n.name, townName: n.town.name }));

  return (
    <header className="sticky top-0 z-40 border-b border-border-brand bg-white/95 backdrop-blur">
      <Container className="flex flex-wrap items-center gap-3 py-3">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>

        <LocationSelector neighbourhoods={neighbourhoodOptions} initialSelection={selectedLocation} />

        <SearchBar placeholder={dict.nav.search} className="order-last w-full sm:order-none sm:flex-1" />

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <LanguageSwitcher className="hidden sm:inline-flex" />

          <Link
            href="/wishlist"
            aria-label={dict.nav.wishlist}
            className="relative hidden rounded-control p-2.5 text-brand-dark hover:bg-brand-bg sm:inline-flex"
          >
            <Heart className="h-5 w-5" aria-hidden />
            {wishlistCount > 0 && (
              <Badge variant="brand" className="absolute -right-1 -top-1 min-w-[18px] justify-center px-1 py-0 text-[10px]">
                {wishlistCount}
              </Badge>
            )}
          </Link>

          <Link href="/cart" aria-label={dict.nav.cart} className="relative rounded-control p-2.5 text-brand-dark hover:bg-brand-bg">
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
                href={user.role === "ADMIN" ? "/admin" : user.role === "VENDOR" ? "/vendor" : user.role === "RIDER" ? "/rider" : "/account"}
                className="hidden items-center gap-1.5 rounded-control px-3 py-2 text-sm font-medium text-brand-dark hover:bg-brand-bg sm:flex"
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
              <Link href="/login" className="rounded-control px-3 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-bg">
                {dict.nav.login}
              </Link>
              <Link
                href="/register"
                className="hidden rounded-control bg-brand-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-hover sm:inline-flex"
              >
                {dict.nav.signup}
              </Link>
            </div>
          )}
        </div>
      </Container>

      <nav aria-label="Categories" className="hidden border-t border-border-brand bg-brand-bg/60 md:block">
        <Container className="flex items-center gap-6 py-2 text-sm font-medium text-brand-dark">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="whitespace-nowrap hover:text-brand-primary">
              {dict.nav[link.labelKey]}
            </Link>
          ))}
          <Link href="/vendor/register" className="ml-auto flex items-center gap-1.5 whitespace-nowrap font-semibold text-brand-primary hover:text-brand-primary-hover">
            <Store className="h-4 w-4" aria-hidden />
            {dict.nav.becomeVendor}
          </Link>
        </Container>
      </nav>
    </header>
  );
}
