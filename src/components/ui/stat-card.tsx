import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({ icon: Icon, label, value, href }: { icon: React.ElementType; label: string; value: string; href?: string }) {
  const card = (
    <Card className={href ? "transition-shadow hover:shadow-lifted" : undefined}>
      <CardContent className="flex items-center gap-3 pt-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-bg text-brand-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="font-heading text-lg font-bold text-brand-dark">{value}</p>
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}
