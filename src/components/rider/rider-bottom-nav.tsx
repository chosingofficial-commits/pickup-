"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bike, Package, Clock, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/rider", label: "Available", icon: Bike },
  { href: "/rider/deliveries", label: "Deliveries", icon: Package },
  { href: "/rider/history", label: "History", icon: Clock },
  { href: "/rider/balance", label: "Balance", icon: Wallet },
];

/**
 * Mobile-only compact tab bar for the 4 pages a rider checks constantly —
 * the desktop top nav (same 4 plus My ads) stays as-is above md, this is
 * hidden there. Profile/My ads/Log out move into RiderMoreMenu on mobile
 * instead of competing for space in this bar.
 */
export function RiderBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Rider"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border-brand bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = href === "/rider" ? pathname === "/rider" : pathname.startsWith(href);
        return (
          <Link
            key={href}
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
