"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Store,
  FileText,
  Bike,
  ClipboardList,
  Tag,
  Ticket,
  Star,
  Wallet,
  Undo2,
  LifeBuoy,
  Settings,
  ScrollText,
  MapPinned,
  Megaphone,
  Ban,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

const GROUPS: { label: string; links: { href: string; label: string; icon: React.ElementType }[] }[] = [
  {
    label: "Overview",
    links: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "People",
    links: [
      { href: "/admin/vendor-applications", label: "Vendor applications", icon: FileText },
      { href: "/admin/vendors", label: "Vendors & restaurants", icon: Store },
      { href: "/admin/riders", label: "Riders", icon: Bike },
      { href: "/admin/customers", label: "Customers", icon: Users },
    ],
  },
  {
    label: "Commerce",
    links: [
      { href: "/admin/orders", label: "Orders", icon: ClipboardList },
      { href: "/admin/categories", label: "Categories", icon: Tag },
      { href: "/admin/coupons", label: "Coupons", icon: Ticket },
      { href: "/admin/reviews", label: "Reviews", icon: Star },
      { href: "/admin/payouts", label: "Vendor payouts", icon: Wallet },
      { href: "/admin/refunds", label: "Refunds", icon: Undo2 },
    ],
  },
  {
    label: "Expansion",
    links: [
      { href: "/admin/locations", label: "Locations & zones", icon: MapPinned },
      { href: "/admin/coverage-requests", label: "Coverage requests", icon: Inbox },
    ],
  },
  {
    label: "Advertising",
    links: [
      { href: "/admin/advertising/requests", label: "Ad requests & campaigns", icon: Megaphone },
      { href: "/admin/advertising/placements", label: "Placements & pricing", icon: Tag },
    ],
  },
  {
    label: "Compliance",
    links: [{ href: "/admin/tobacco", label: "Age-restricted products", icon: Ban }],
  },
  {
    label: "Platform",
    links: [
      { href: "/admin/support", label: "Support tickets", icon: LifeBuoy },
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/audit-logs", label: "Audit logs", icon: ScrollText },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin dashboard" className="space-y-5">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">{group.label}</p>
          <div className="space-y-0.5">
            {group.links.map(({ href, label, icon: Icon }) => {
              const isActive = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-medium",
                    isActive ? "bg-brand-primary text-white" : "text-brand-dark hover:bg-brand-bg",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
