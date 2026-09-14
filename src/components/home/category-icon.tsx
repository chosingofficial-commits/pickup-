import { ShoppingBasket, Package, Home, Sparkles, Ban, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = { ShoppingBasket, Package, Home, Sparkles, Ban };

export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || ShoppingBasket;
  return <Icon className={className} aria-hidden />;
}
