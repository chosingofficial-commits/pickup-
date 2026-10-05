"use client";

import { useState } from "react";
import { ProductImage } from "@/components/product/product-image";
import { formatBDT } from "@/lib/utils";
import { MenuItemDetailDialog } from "./menu-item-detail-dialog";

export type AddOn = { id: string; name: string; priceDelta: string; isPopular: boolean };
export type AddOnGroup = { id: string; name: string; isRequired: boolean; minSelect: number; maxSelect: number; addOns: AddOn[] };
export type SuggestionItem = { id: string; name: string; price: string; imageUrl: string | null };
export type MenuItemWithDetail = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  compareAtPrice: string | null;
  imageUrl: string | null;
  ingredients: string | null;
  allergens: string | null;
  isAvailable: boolean;
  allowsInstructions: boolean;
  photos: string[];
  addOnGroups: AddOnGroup[];
  suggestions: SuggestionItem[];
};

export function MenuItemCard({ item, canOrder }: { item: MenuItemWithDetail; canOrder: boolean }) {
  const [open, setOpen] = useState(false);
  const soldOut = !item.isAvailable;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex w-full gap-3 rounded-card border border-border-brand bg-white p-3 text-left transition-shadow hover:shadow-soft ${soldOut ? "opacity-60" : ""}`}
      >
        <ProductImage
          src={item.imageUrl}
          alt={item.name}
          categorySlug="restaurant"
          className={`h-20 w-20 shrink-0 rounded-control ${soldOut ? "grayscale" : ""}`}
          emoji="🍽️"
        />
        <div className="flex flex-1 flex-col">
          <h3 className="font-heading text-sm font-bold text-brand-dark">{item.name}</h3>
          {item.description && <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{item.description}</p>}
          <div className="mt-auto flex items-center justify-between pt-2">
            <span className="flex items-baseline gap-1.5">
              <span className="font-heading text-sm font-bold text-brand-dark">{formatBDT(item.price)}</span>
              {item.compareAtPrice && <span className="text-xs text-gray-400 line-through">{formatBDT(item.compareAtPrice)}</span>}
            </span>
            {soldOut ? (
              <span className="rounded-full bg-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600">Sold out</span>
            ) : canOrder ? (
              <span className="rounded-control bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white">Add</span>
            ) : (
              <span className="text-xs font-medium text-gray-400">Closed</span>
            )}
          </div>
        </div>
      </button>

      {open && <MenuItemDetailDialog item={item} canOrder={canOrder} onClose={() => setOpen(false)} />}
    </>
  );
}
