import Image from "next/image";
import { cn } from "@/lib/utils";
import { isRenderableImageUrl } from "@/lib/image-url";

/**
 * Circular vendor/restaurant logo. Falls back to a crop of the cover photo
 * when there's no logo, and only falls back further to an initial letter
 * when neither image exists.
 */
export function VendorLogo({
  logoUrl,
  coverImageUrl,
  businessName,
  size = 40,
  className,
}: {
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  businessName: string;
  size?: number;
  className?: string;
}) {
  const imageUrl = [logoUrl, coverImageUrl].find(isRenderableImageUrl);
  if (imageUrl) {
    return (
      <div
        className={cn("relative shrink-0 overflow-hidden rounded-full border-2 border-white bg-white shadow-soft", className)}
        style={{ width: size, height: size }}
      >
        <Image src={imageUrl} alt={`${businessName} logo`} fill sizes={`${size}px`} className="object-cover" />
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
