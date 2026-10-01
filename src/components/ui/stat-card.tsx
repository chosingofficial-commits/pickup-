import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({ icon: Icon, label, value, href }: { icon: React.ElementType; label: string; value: string; href?: string }) {
  const content = (
    <CardContent className="flex items-center gap-3 pt-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-bg text-brand-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-heading text-lg font-bold text-brand-dark">{value}</p>
      </div>
      {href && <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" aria-hidden />}
    </CardContent>
  );

  if (!href) return <Card>{content}</Card>;

  return (
    <Link href={href} className="block rounded-card transition-transform active:scale-[0.98]">
      <Card className="h-full transition-colors hover:border-brand-primary hover:shadow-lifted">{content}</Card>
    </Link>
  );
}
