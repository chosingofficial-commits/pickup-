"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingCart, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav({ accountHref }: { accountHref: string }) {
  const pathname = usePathname();

  const items = [
    { href: "/", label: "Home", icon: Home },
    { href: "/marketplace", label: "Shop", icon: LayoutGrid },
    { href: "/cart", label: "Cart", icon: ShoppingCart },
    // Role-based: a rider/vendor/admin browsing the storefront must land back
    // on their own dashboard, not the customer account page (and a logged-out
    // visitor is sent to log in) — never hardcode "/account" here.
    { href: accountHref, label: "Account", icon: UserRound },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border-brand bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map(({ href, label, icon: Icon }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={label}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium",
              isActive ? "text-brand-primary" : "text-gray-500",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
