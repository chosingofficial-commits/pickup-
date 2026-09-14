import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "brand" | "accent" | "dark" | "outline" | "success" | "warning" | "danger";

const variantClasses: Record<BadgeVariant, string> = {
  brand: "bg-brand-primary text-white",
  accent: "bg-brand-accent/50 text-brand-dark",
  dark: "bg-brand-dark text-white",
  outline: "border border-border-brand text-brand-dark bg-white",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-700",
};

export function Badge({
  className,
  variant = "accent",
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold leading-none",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
