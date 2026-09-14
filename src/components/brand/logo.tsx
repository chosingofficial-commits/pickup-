import { cn } from "@/lib/utils";

/**
 * Original text-and-icon wordmark. Intentionally simple so it can be swapped
 * for a professionally designed logo later without touching layout code —
 * every consumer just renders <Logo />.
 */
export function Logo({
  className,
  iconOnly = false,
  size = "md",
}: {
  className?: string;
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const dims = { sm: 28, md: 34, lg: 44 }[size];
  const textSize = { sm: "text-lg", md: "text-xl", lg: "text-2xl" }[size];

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width={dims}
        height={dims}
        viewBox="0 0 40 40"
        fill="none"
        role="img"
        aria-label="Pick Up logo"
      >
        <rect width="40" height="40" rx="12" fill="#1B5E20" />
        <path
          d="M12 27V15.5C12 13.567 13.567 12 15.5 12H21C23.7614 12 26 14.2386 26 17C26 19.7614 23.7614 22 21 22H15.5V27"
          stroke="#E8F5E9"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="27.5" cy="27.5" r="4.5" fill="#66BB6A" />
        <path
          d="M25.7 27.5L26.9 28.7L29.3 26.3"
          stroke="white"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!iconOnly && (
        <span className={cn("font-heading font-extrabold tracking-tight", textSize)}>
          <span className="text-brand-dark">Pick</span> <span className="text-brand-primary">Up</span>
        </span>
      )}
    </span>
  );
}
