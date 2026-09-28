"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Package, MapPin, Heart, Store, Star, Ticket, Bell, LifeBuoy, ShieldCheck, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/lib/actions/auth";

const LINKS = [
  { href: "/account", label: "Profile", icon: User },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/addresses", label: "Saved addresses", icon: MapPin },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/favorites", label: "Favorite shops", icon: Store },
  { href: "/account/reviews", label: "My reviews", icon: Star },
  { href: "/account/coupons", label: "Coupons", icon: Ticket },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
  { href: "/account/support", label: "Support", icon: LifeBuoy },
  { href: "/account/security", label: "Password & security", icon: ShieldCheck },
];

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
      {/* First, not last — on mobile this is a scrollable row, and burying
          "Log out" after 10 other links would defeat the point of putting it
          here in the first place (the header's own logout button is icon-only
          on mobile now and just links to /account, it doesn't log out). */}
      <form action={logoutAction} className="contents">
        <button
          type="submit"
          className="flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-control px-3.5 py-2.5 text-sm font-medium text-brand-dark hover:bg-brand-bg lg:shrink"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Log out
        </button>
      </form>
      {LINKS.map(({ href, label, icon: Icon }) => {
        const isActive = href === "/account" ? pathname === "/account" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-control px-3.5 py-2.5 text-sm font-medium lg:shrink",
              isActive ? "bg-brand-primary text-white" : "text-brand-dark hover:bg-brand-bg",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
