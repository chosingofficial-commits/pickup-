import { z } from "zod";
import { VARIANT_UNITS } from "@/lib/catalog/variant-label";
import { optionalText, optionalNumber } from "./form-helpers";

export const MAX_PRODUCT_PHOTOS = 6;

// Price, compare-at-price, unit, and stock all moved to per-variant fields —
// every product has at least one size/option row (see the variants
// backfill), so there's no longer a separate "simple product" shape without
// them; a product with just one option is just a variant list of length 1.
export const productSchema = z.object({
  name: z.string().trim().min(2, "Enter a product name").max(150),
  categoryId: z.string().min(1, "Choose a category"),
  description: optionalText(z.string().trim().max(2000)),
  sku: optionalText(z.string().trim().max(60)),
  isWeeklyGrocery: z.coerce.boolean().default(false),
});

export const variantRowSchema = z.object({
  id: z.string().trim().optional(),
  quantityValue: z.coerce.number().positive("Enter a size greater than 0"),
  unit: z.enum(VARIANT_UNITS, { message: "Choose a unit" }),
  packCount: z.coerce.number().int().min(1).default(1),
  price: z.coerce.number().min(0, "Enter a price"),
  compareAtPrice: optionalNumber(z.coerce.number().positive()),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
});
export type VariantRowInput = z.infer<typeof variantRowSchema>;

export const variantRowsSchema = z.array(variantRowSchema).min(1, "Add at least one size/option");
