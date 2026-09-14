import { Smartphone } from "lucide-react";

export function AppPromo() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-border-brand bg-brand-bg p-6 text-center sm:flex-row sm:text-left">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-brand-primary shadow-soft">
        <Smartphone className="h-7 w-7" aria-hidden />
      </span>
      <div>
        <h2 className="font-heading text-lg font-bold text-brand-dark">Order on the go</h2>
        <p className="mt-1 max-w-md text-sm text-gray-600">
          Pick Up works great right from your phone&apos;s browser — no download needed. On Android or iPhone, open the
          menu and choose &quot;Add to Home Screen&quot; for one-tap access next time. Native apps are on our roadmap.
        </p>
      </div>
    </div>
  );
}
