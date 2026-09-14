import { z } from "zod";

export const productSchema = z.object({
  name: z.string().trim().min(2, "Enter a product name").max(150),
  categoryId: z.string().min(1, "Choose a category"),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  price: z.coerce.number().positive("Enter a valid price"),
  compareAtPrice: z.preprocess(
    (val) => (val === "" || val == null ? undefined : val),
    z.coerce.number().positive().optional(),
  ),
  unit: z.string().trim().min(1, "Enter a unit, e.g. 1 kg").max(40),
  sku: z.string().trim().max(60).optional().or(z.literal("")),
  quantityInStock: z.coerce.number().int().min(0, "Stock cannot be negative"),
  isWeeklyGrocery: z.coerce.boolean().default(false),
});
