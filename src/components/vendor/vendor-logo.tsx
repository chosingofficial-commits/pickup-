import Image from "next/image";
import { cn } from "@/lib/utils";

/** Circular vendor/restaurant logo, with a neat initial-letter fallback when none is set. */
export function VendorLogo({
  logoUrl,
  businessName,
  size = 40,
  className,
}: {
  logoUrl?: string | null;
  businessName: string;
  size?: number;
  className?: string;
}) {
  if (logoUrl) {
    return (
      <div
        className={cn("relative shrink-0 overflow-hidden rounded-full border-2 border-white bg-white shadow-soft", className)}
        style={{ width: size, height: size }}
      >
        <Image src={logoUrl} alt={`${businessName} logo`} fill sizes={`${size}px`} className="object-cover" />
      </div>
    );
  }

  const initial = businessName.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full border-2 border-white bg-brand-primary font-heading font-bold text-white shadow-soft", className)}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden
    >
      {initial}
    </div>
  );
}
