import { formatBDT } from "@/lib/utils";

export function SalesChart({ series }: { series: { date: string; total: number }[] }) {
  const max = Math.max(1, ...series.map((s) => s.total));

  return (
    <div>
      <div className="flex h-40 items-end gap-1">
        {series.map((point) => (
          <div key={point.date} className="group relative flex-1">
            <div
              className="rounded-t bg-brand-primary transition-all group-hover:bg-brand-primary-hover"
              style={{ height: `${Math.max(2, (point.total / max) * 100)}%`, minHeight: 2 }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-brand-dark px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100">
              {formatBDT(point.total)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-gray-400">
        <span>{series[0]?.date.slice(5)}</span>
        <span>{series[series.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}
