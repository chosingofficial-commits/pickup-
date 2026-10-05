"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { X, Minus, Plus } from "lucide-react";
import { addMenuItemToCartAction } from "@/lib/actions/cart";
import { initialActionState } from "@/lib/actions/types";
import { ProductImage } from "@/components/product/product-image";
import { formatBDT } from "@/lib/utils";
import type { AddOnGroup, MenuItemWithDetail } from "./menu-item-card";

function defaultSelection(groups: AddOnGroup[]): Record<string, Set<string>> {
  const initial: Record<string, Set<string>> = {};
  for (const g of groups) {
    // A required single-choice group gets a sensible default so the button
    // isn't needlessly disabled — a required multi-choice group can't be
    // guessed, so it starts empty and the Add button stays disabled with a hint.
    initial[g.id] = g.isRequired && g.maxSelect === 1 && g.addOns.length > 0 ? new Set([g.addOns[0]!.id]) : new Set();
  }
  return initial;
}

export function MenuItemDetailDialog({ item, canOrder, onClose }: { item: MenuItemWithDetail; canOrder: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [state, formAction, pending] = useActionState(addMenuItemToCartAction, initialActionState);
  const soldOut = !item.isAvailable;
  const canAddToCart = canOrder && !soldOut;

  const [selected, setSelected] = useState<Record<string, Set<string>>>(() => defaultSelection(item.addOnGroups));
  const [quantity, setQuantity] = useState(1);
  const [suggested, setSuggested] = useState<Set<string>>(new Set());
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [unavailableAction, setUnavailableAction] = useState("REMOVE");
  const [galleryIndex, setGalleryIndex] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);
  const closedRef = useRef(false);

  const photos = item.photos.length > 0 ? item.photos : item.imageUrl ? [item.imageUrl] : [];

  function close() {
    if (closedRef.current) return;
    closedRef.current = true;
    window.history.back();
  }

  // Desktop: centered dialog over a full-page dark overlay. Mobile: full-screen
  // sheet with the page behind locked from scrolling. Closes via the ✕ button,
  // Esc, or the device back button — all three route through close(), which
  // pops the history entry pushed below so back navigation stays consistent
  // (the actual state flip happens in the popstate handler, not here).
  useEffect(() => {
    document.body.style.overflow = "hidden";
    window.history.pushState({ menuItemDialog: true }, "");
    function onPopState() {
      closedRef.current = true;
      onClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("popstate", onPopState);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.status === "success") close();
  }, [state.status]);

  function toggleAddOn(group: AddOnGroup, addOnId: string) {
    setSelected((prev) => {
      const next = { ...prev };
      const current = new Set(next[group.id]);
      if (group.maxSelect === 1) {
        next[group.id] = current.has(addOnId) && !group.isRequired ? new Set() : new Set([addOnId]);
      } else {
        if (current.has(addOnId)) current.delete(addOnId);
        else if (current.size < group.maxSelect) current.add(addOnId);
        next[group.id] = current;
      }
      return next;
    });
  }

  function toggleSuggestion(id: string) {
    setSuggested((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleGalleryScroll() {
    const el = galleryRef.current;
    if (!el || el.clientWidth === 0) return;
    setGalleryIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  const optionsTotal = item.addOnGroups.reduce((sum, g) => {
    const sel = selected[g.id] ?? new Set();
    return sum + g.addOns.filter((a) => sel.has(a.id)).reduce((s, a) => s + Number(a.priceDelta), 0);
  }, 0);
  const suggestionsTotal = item.suggestions.filter((s) => suggested.has(s.id)).reduce((s, x) => s + Number(x.price), 0);
  const liveTotal = (Number(item.price) + optionsTotal) * quantity + suggestionsTotal;

  const groupValidity = item.addOnGroups.map((g) => {
    const count = (selected[g.id] ?? new Set()).size;
    return { group: g, valid: count >= g.minSelect && count <= g.maxSelect };
  });
  const allValid = groupValidity.every((g) => g.valid);
  const firstInvalid = groupValidity.find((g) => !g.valid)?.group;

  const selectedAddOnIds = item.addOnGroups.flatMap((g) => Array.from(selected[g.id] ?? []));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 sm:p-4" role="dialog" aria-modal="true" aria-label={item.name}>
      <div className="flex h-full w-full flex-col bg-white sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-card">
        <div className="flex shrink-0 items-center justify-between border-b border-border-brand px-4 py-3">
          <h2 className="font-heading text-base font-bold text-brand-dark">{item.name}</h2>
          <button type="button" onClick={close} aria-label="Close" className="rounded-control p-1.5 text-gray-500 hover:bg-brand-bg hover:text-brand-dark">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {photos.length > 0 && (
            <div className="relative bg-surface-muted">
              <div ref={galleryRef} onScroll={handleGalleryScroll} className="flex snap-x snap-mandatory overflow-x-auto">
                {photos.map((url, i) => (
                  <div key={url + i} className="relative aspect-[4/3] w-full shrink-0 snap-center">
                    {/* eslint-disable-next-line @next/next/no-img-element -- gallery needs plain lazy <img>, not next/image's fixed-size optimizer, to stay "never cropped" at any aspect ratio */}
                    <img src={url} alt={`${item.name} photo ${i + 1}`} loading="lazy" className="h-full w-full object-contain" />
                  </div>
                ))}
              </div>
              {photos.length > 1 && (
                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {photos.map((url, i) => (
                    <span key={url + i} className={`h-1.5 w-1.5 rounded-full ${i === galleryIndex ? "bg-brand-primary" : "bg-white/70"}`} />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-4 p-4">
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-heading text-lg font-bold text-brand-dark">{item.name}</h3>
                {soldOut && <span className="shrink-0 rounded-full bg-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600">Sold out</span>}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-heading text-base font-bold text-brand-dark">{formatBDT(item.price)}</span>
                {item.compareAtPrice && <span className="text-sm text-gray-400 line-through">{formatBDT(item.compareAtPrice)}</span>}
              </div>
              {item.description && <p className="mt-2 text-sm text-gray-600">{item.description}</p>}
            </div>

            {(item.ingredients || item.allergens) && (
              <div className="space-y-1 rounded-control bg-surface-muted p-3 text-xs text-gray-600">
                {item.ingredients && (
                  <p>
                    <span className="font-semibold text-brand-dark">Ingredients: </span>
                    {item.ingredients}
                  </p>
                )}
                {item.allergens && (
                  <p>
                    <span className="font-semibold text-brand-dark">Allergens: </span>
                    {item.allergens}
                  </p>
                )}
              </div>
            )}

            {!soldOut &&
              item.addOnGroups.map((group) => {
                const sel = selected[group.id] ?? new Set();
                const validity = groupValidity.find((v) => v.group.id === group.id)!;
                return (
                  <fieldset key={group.id}>
                    <legend className="mb-1.5 flex w-full items-center justify-between gap-2 text-sm font-semibold text-brand-dark">
                      <span>{group.name}</span>
                      <span className="text-xs font-normal text-gray-500">
                        {group.isRequired ? "Required" : "Optional"}
                        {group.maxSelect > 1 && ` · Select up to ${group.maxSelect}`}
                      </span>
                    </legend>
                    {!validity.valid && (
                      <p className="mb-1.5 text-xs text-red-600">
                        {group.minSelect > 0 ? `Choose ${group.minSelect === group.maxSelect ? group.minSelect : `at least ${group.minSelect}`} option(s)` : `Choose up to ${group.maxSelect}`}
                      </p>
                    )}
                    <div className="space-y-1.5">
                      {group.addOns.map((addOn) => (
                        <label key={addOn.id} className="flex items-center justify-between gap-2 rounded-control border border-border-brand px-3 py-2 text-sm">
                          <span className="flex items-center gap-2">
                            <input type={group.maxSelect > 1 ? "checkbox" : "radio"} checked={sel.has(addOn.id)} onChange={() => toggleAddOn(group, addOn.id)} />
                            {addOn.name}
                            {addOn.isPopular && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">Popular</span>}
                          </span>
                          {Number(addOn.priceDelta) > 0 && <span className="text-gray-500">+{formatBDT(addOn.priceDelta)}</span>}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                );
              })}

            {!soldOut && item.suggestions.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-semibold text-brand-dark">Frequently bought together</p>
                <div className="space-y-1.5">
                  {item.suggestions.map((s) => (
                    <label key={s.id} className="flex items-center gap-2.5 rounded-control border border-border-brand p-2 text-sm">
                      <input type="checkbox" checked={suggested.has(s.id)} onChange={() => toggleSuggestion(s.id)} />
                      <ProductImage src={s.imageUrl} alt={s.name} categorySlug="restaurant" className="h-10 w-10 shrink-0 rounded-control" emoji="🍽️" />
                      <span className="flex-1">{s.name}</span>
                      <span className="text-gray-600">{formatBDT(s.price)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {!soldOut && item.allowsInstructions && (
              <div>
                <label htmlFor="menuItemSpecialInstructions" className="mb-1 block text-sm font-semibold text-brand-dark">
                  Special instructions
                </label>
                <textarea
                  id="menuItemSpecialInstructions"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows={2}
                  className="w-full rounded-control border border-border-brand px-3 py-2 text-sm"
                  placeholder="E.g. less spicy, no onion"
                />
              </div>
            )}

            {!soldOut && (
              <div>
                <label htmlFor="menuItemUnavailableAction" className="mb-1 block text-sm font-semibold text-brand-dark">
                  If this item is not available
                </label>
                <select
                  id="menuItemUnavailableAction"
                  value={unavailableAction}
                  onChange={(e) => setUnavailableAction(e.target.value)}
                  className="w-full rounded-control border border-border-brand px-3 py-2 text-sm"
                >
                  <option value="REMOVE">Remove it from my order</option>
                  <option value="CALL">Call me</option>
                </select>
              </div>
            )}

            {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}
          </div>
        </div>

        {canAddToCart ? (
          <form action={formAction} className="shrink-0 border-t border-border-brand bg-white p-4">
            <input type="hidden" name="menuItemId" value={item.id} />
            <input type="hidden" name="redirectPath" value={pathname} />
            <input type="hidden" name="quantity" value={quantity} />
            <input type="hidden" name="specialInstructions" value={specialInstructions} />
            <input type="hidden" name="unavailableAction" value={unavailableAction} />
            {selectedAddOnIds.map((id) => (
              <input key={id} type="hidden" name="addOnId" value={id} />
            ))}
            {Array.from(suggested).map((id) => (
              <input key={id} type="hidden" name="suggestedItemId" value={id} />
            ))}
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-control border border-border-brand">
                <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" className="flex h-11 w-10 items-center justify-center text-brand-dark">
                  <Minus className="h-4 w-4" aria-hidden />
                </button>
                <span className="w-8 text-center text-sm" aria-live="polite">
                  {quantity}
                </span>
                <button type="button" onClick={() => setQuantity((q) => q + 1)} aria-label="Increase quantity" className="flex h-11 w-10 items-center justify-center text-brand-dark">
                  <Plus className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <button
                type="submit"
                disabled={!allValid || pending}
                className="flex h-11 flex-1 items-center justify-center rounded-control bg-brand-primary px-3 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-50"
              >
                {pending ? "Adding…" : !allValid && firstInvalid ? `Choose ${firstInvalid.name.toLowerCase()}` : `Add to cart · ${formatBDT(liveTotal)}`}
              </button>
            </div>
          </form>
        ) : (
          <div className="shrink-0 border-t border-border-brand bg-white p-4">
            <button type="button" disabled className="flex h-11 w-full items-center justify-center rounded-control bg-gray-200 text-sm font-semibold text-gray-500">
              {soldOut ? "Sold out" : "Restaurant closed"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
