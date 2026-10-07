"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Package, MapPin, Heart, Store, Star, Ticket, Bell, LifeBuoy, ShieldCheck, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

const CUSTOMER_LINKS = [
  { href: "/account", label: "Profile", icon: User },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/addresses", label: "Saved addresses", icon: MapPin },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/favorites", label: "Favorite shops", icon: Store },
  { href: "/account/reviews", label: "My reviews", icon: Star },
  { href: "/account/coupons", label: "Coupons", icon: Ticket },
  { href: "/account/ads", label: "My ads", icon: Megaphone },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
  { href: "/account/support", label: "Support", icon: LifeBuoy },
  { href: "/account/security", label: "Password & security", icon: ShieldCheck },
];

// Vendors and riders manage their storefront/deliveries, and now also their
// ads, from their own dashboards (/vendor, /rider) — this section is just
// for the handful of pages that apply to any account regardless of role.
const OTHER_ROLE_LINKS = [
  { href: "/account", label: "Profile", icon: User },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
  { href: "/account/support", label: "Support", icon: LifeBuoy },
  { href: "/account/security", label: "Password & security", icon: ShieldCheck },
];

export function AccountNav({ role }: { role: "CUSTOMER" | "VENDOR" | "RIDER" | "ADMIN" }) {
  const pathname = usePathname();
  const links = role === "CUSTOMER" ? CUSTOMER_LINKS : OTHER_ROLE_LINKS;

  return (
    <nav aria-label="Account" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
      {links.map(({ href, label, icon: Icon }) => {
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
