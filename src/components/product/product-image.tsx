import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Renders a real photo when `src` is set, otherwise a category-tinted
 * placeholder tile. Demo/seed data intentionally ships without photography
 * (see README "Images") — vendors upload real photos through the storage
 * adapter once object storage is configured.
 */
const CATEGORY_STYLE: Record<string, { emoji: string; from: string; to: string }> = {
  "rice-grains": { emoji: "🌾", from: "#fff8e1", to: "#e8f5e9" },
  vegetables: { emoji: "🥦", from: "#e8f5e9", to: "#c8e6c9" },
  fruits: { emoji: "🍎", from: "#fdf2e9", to: "#e8f5e9" },
  "dairy-eggs": { emoji: "🥚", from: "#f5f5f5", to: "#e8f5e9" },
  "meat-fish": { emoji: "🐟", from: "#eef7f3", to: "#dcedc8" },
  "cooking-oil-spices": { emoji: "🧂", from: "#fff3e0", to: "#e8f5e9" },
  beverages: { emoji: "🥤", from: "#e3f2fd", to: "#e8f5e9" },
  snacks: { emoji: "🍿", from: "#fff8e1", to: "#f1f8e9" },
  "baby-care": { emoji: "🍼", from: "#f3f8ff", to: "#e8f5e9" },
  stationery: { emoji: "✏️", from: "#f5f5f5", to: "#e8f5e9" },
  "cleaning-supplies": { emoji: "🧼", from: "#e0f7fa", to: "#e8f5e9" },
  "kitchen-dining": { emoji: "🍽️", from: "#fbe9e7", to: "#e8f5e9" },
  "bath-body": { emoji: "🧴", from: "#f3e5f5", to: "#e8f5e9" },
  "hair-care": { emoji: "💇", from: "#ede7f6", to: "#e8f5e9" },
  restaurant: { emoji: "🍛", from: "#fff3e0", to: "#e8f5e9" },
  vendor: { emoji: "🏪", from: "#e8f5e9", to: "#c8e6c9" },
};

const DEFAULT_STYLE = { emoji: "🛒", from: "#e8f5e9", to: "#c8e6c9" };

export function ProductImage({
  src,
  alt,
  categorySlug,
  className,
  emoji,
}: {
  src?: string | null;
  alt: string;
  categorySlug?: string | null;
  className?: string;
  emoji?: string;
}) {
  if (src) {
    return (
      <div className={cn("relative overflow-hidden bg-surface-muted", className)}>
        <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
      </div>
    );
  }

  const style = (categorySlug ? CATEGORY_STYLE[categorySlug] : undefined) ?? DEFAULT_STYLE;

  return (
    <div
      role="img"
      aria-label={alt}
      className={cn("flex items-center justify-center overflow-hidden", className)}
      style={{ background: `linear-gradient(135deg, ${style.from}, ${style.to})` }}
    >
      <span className="text-4xl" aria-hidden>
        {emoji ?? style.emoji}
      </span>
    </div>
  );
}
