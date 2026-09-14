"use client";

import { useRef } from "react";
import Link from "next/link";
import { Eye, Star, X } from "lucide-react";
import { ProductImage } from "./product-image";
import { AddToCartButton } from "./add-to-cart-button";
import { formatBDT } from "@/lib/utils";

export type PlainQuickViewProduct = {
  id: string;
  name: string;
  slug: string;
  unit: string;
  price: string;
  ratingAvg: string;
  ratingCount: number;
  images: { url: string }[];
  category: { slug: string };
  vendor: { slug: string; businessName: string };
};

export function QuickViewButton({ product }: { product: PlainQuickViewProduct }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const href = `/marketplace/${product.vendor.slug}/${product.slug}`;

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label={`Quick view of ${product.name}`}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-brand-dark shadow-soft hover:bg-white"
      >
        <Eye className="h-4 w-4" aria-hidden />
      </button>

      <dialog
        ref={dialogRef}
        aria-label={`${product.name} quick view`}
        className="w-full max-w-md rounded-card border border-border-brand p-0 shadow-lifted backdrop:bg-black/40"
      >
        <div className="flex items-center justify-between border-b border-border-brand p-3">
          <span className="text-sm font-semibold text-brand-dark">Quick view</span>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="rounded-full p-1.5 text-gray-500 hover:bg-brand-bg"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="p-4">
          <ProductImage
            src={product.images[0]?.url}
            alt={product.name}
            categorySlug={product.category.slug}
            className="aspect-video w-full rounded-control"
          />
          <h3 className="mt-3 font-heading text-lg font-bold text-brand-dark">{product.name}</h3>
          <p className="text-sm text-gray-500">
            {product.unit} · {product.vendor.businessName}
          </p>
          {product.ratingCount > 0 && (
            <div className="mt-1 flex items-center gap-1 text-xs text-gray-600">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
              {Number(product.ratingAvg).toFixed(1)} ({product.ratingCount} reviews)
            </div>
          )}
          <p className="mt-2 font-heading text-xl font-bold text-brand-dark">{formatBDT(product.price)}</p>

          <div className="mt-4 flex items-center gap-2">
            <AddToCartButton productId={product.id} className="flex-1" />
            <Link
              href={href}
              className="inline-flex h-10 items-center justify-center rounded-control border border-border-brand px-4 text-sm font-semibold text-brand-dark hover:bg-brand-bg"
            >
              View details
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}
