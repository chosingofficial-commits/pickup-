"use client";

import { useState, useSyncExternalStore } from "react";
import { ShieldAlert } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import type { ProductListItem } from "@/lib/catalog/queries";

const SESSION_KEY = "pickup_tobacco_age_confirmed";

function noopSubscribe() {
  return () => {};
}
function getSnapshot() {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}
function getServerSnapshot() {
  return false;
}

export function CigaretteSection({
  products,
  minimumAge,
  healthWarningText,
}: {
  products: ProductListItem[];
  minimumAge: number;
  healthWarningText: string;
}) {
  const storedConfirmed = useSyncExternalStore(noopSubscribe, getSnapshot, getServerSnapshot);
  const [confirmedThisRender, setConfirmedThisRender] = useState(false);
  const [checked, setChecked] = useState(false);
  const confirmed = storedConfirmed || confirmedThisRender;

  if (!confirmed) {
    return (
      <div className="mx-auto max-w-md rounded-card border border-border-brand bg-white p-6 text-center shadow-soft">
        <ShieldAlert className="mx-auto h-8 w-8 text-red-600" aria-hidden />
        <h2 className="mt-3 font-heading text-lg font-bold text-brand-dark">Age restricted</h2>
        <p className="mt-1 text-sm text-gray-600">{healthWarningText}</p>
        <p className="mt-3 text-xs text-gray-500">
          You may be asked to verify your age with a valid ID at the time of delivery.
        </p>
        <label className="mt-4 flex items-start gap-2 text-left text-sm text-gray-700">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          I confirm that I am at least {minimumAge} years old.
        </label>
        <button
          type="button"
          disabled={!checked}
          onClick={() => {
            sessionStorage.setItem(SESSION_KEY, "1");
            setConfirmedThisRender(true);
          }}
          className="mt-4 w-full rounded-control bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-control border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
        {healthWarningText}
      </div>
      {products.length === 0 ? (
        <p className="text-sm text-gray-500">No products available right now.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
