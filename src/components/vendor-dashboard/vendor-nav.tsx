"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Ticket,
  Star,
  Store,
  Wallet,
  UtensilsCrossed,
  Clock,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusinessType } from "@/generated/prisma/client";

export function VendorNav({ businessType }: { businessType: BusinessType }) {
  const pathname = usePathname();
  const isRestaurant = businessType === "RESTAURANT";

  const links = [
    { href: "/vendor", label: "Overview", icon: LayoutDashboard },
    ...(isRestaurant
      ? [
          { href: "/vendor/menu", label: "Menu", icon: UtensilsCrossed },
          { href: "/vendor/hours", label: "Opening hours", icon: Clock },
        ]
      : [{ href: "/vendor/products", label: "Products", icon: Package }]),
    { href: "/vendor/orders", label: "Orders", icon: ClipboardList },
    { href: "/vendor/coupons", label: "Coupons", icon: Ticket },
    { href: "/vendor/reviews", label: "Reviews", icon: Star },
    { href: "/vendor/payouts", label: "Payouts", icon: Wallet },
    { href: "/vendor/profile", label: "Business profile", icon: Store },
    { href: "/account/ads", label: "My ads", icon: Megaphone },
  ];

  return (
    <nav aria-label="Vendor dashboard" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
      {links.map(({ href, label, icon: Icon }) => {
        const isActive = href === "/vendor" ? pathname === "/vendor" : pathname.startsWith(href);
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
