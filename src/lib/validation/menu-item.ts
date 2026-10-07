import { z } from "zod";
import { optionalText, optionalNumber } from "./form-helpers";

// Was 4 — lowered to 3. Existing items with more than 3 photos keep them
// (never silently deleted); the edit form shows every existing photo and
// asks the vendor to remove extras down to 3 before it'll save — see
// menu-item-row.tsx and the >MAX_MENU_ITEM_PHOTOS rejection in vendor-menu.ts.
export const MAX_MENU_ITEM_PHOTOS = 3;
export const MAX_SUGGESTED_ITEMS = 10;

export const menuSchema = z.object({ name: z.string().trim().min(2, "Enter a menu name").max(80) });

const nameSchema = z.string().trim().min(2, "Enter an item name").max(120);
const priceSchema = z.coerce.number().positive("Enter a valid price");
const descriptionSchema = optionalText(z.string().trim().max(500));
const compareAtPriceSchema = optionalNumber(z.coerce.number().positive());
const imageUrlSchema = optionalText(z.string().url());
const ingredientsSchema = optionalText(z.string().trim().max(1000));
const allergensSchema = optionalText(z.string().trim().max(300));

export const menuItemSchema = z
  .object({
    menuId: z.string().min(1),
    name: nameSchema,
    description: descriptionSchema,
    price: priceSchema,
    compareAtPrice: compareAtPriceSchema,
    imageUrl: imageUrlSchema,
    ingredients: ingredientsSchema,
    allergens: allergensSchema,
  })
  .refine((data) => data.compareAtPrice == null || data.compareAtPrice > data.price, {
    message: "Old price must be higher than the current price.",
    path: ["compareAtPrice"],
  });

export const updateMenuItemSchema = z
  .object({
    itemId: z.string().min(1),
    name: nameSchema,
    description: descriptionSchema,
    price: priceSchema,
    compareAtPrice: compareAtPriceSchema,
    ingredients: ingredientsSchema,
    allergens: allergensSchema,
  })
  .refine((data) => data.compareAtPrice == null || data.compareAtPrice > data.price, {
    message: "Old price must be higher than the current price.",
    path: ["compareAtPrice"],
  });

export const menuItemPhotosSchema = z.array(z.string().url()).max(MAX_MENU_ITEM_PHOTOS, `Up to ${MAX_MENU_ITEM_PHOTOS} photos only.`);

export const menuItemSuggestionsSchema = z.array(z.string().min(1)).max(MAX_SUGGESTED_ITEMS, `Pick up to ${MAX_SUGGESTED_ITEMS} items.`);

const groupMinMaxFields = {
  name: z.string().trim().min(2, "Enter a group name (e.g. Size)").max(80),
  isRequired: z.boolean(),
  minSelect: z.coerce.number().int().min(0).max(20),
  maxSelect: z.coerce.number().int().min(1, "Max choices must be at least 1").max(20),
};

export const addOnGroupSchema = z
  .object({ menuItemId: z.string().min(1), ...groupMinMaxFields })
  .refine((d) => d.minSelect <= d.maxSelect, { message: "Min choices can't be more than max choices.", path: ["minSelect"] })
  .refine((d) => !d.isRequired || d.minSelect >= 1, { message: "A required group needs at least 1 minimum choice.", path: ["minSelect"] })
  .transform((d) => ({ ...d, minSelect: d.isRequired ? d.minSelect : 0 }));

export const updateAddOnGroupSchema = z
  .object({ groupId: z.string().min(1), ...groupMinMaxFields })
  .refine((d) => d.minSelect <= d.maxSelect, { message: "Min choices can't be more than max choices.", path: ["minSelect"] })
  .refine((d) => !d.isRequired || d.minSelect >= 1, { message: "A required group needs at least 1 minimum choice.", path: ["minSelect"] })
  .transform((d) => ({ ...d, minSelect: d.isRequired ? d.minSelect : 0 }));

export const addOnSchema = z.object({
  groupId: z.string().min(1),
  name: z.string().trim().min(1, "Enter an option name").max(80),
  priceDelta: z.coerce.number().min(0, "Extra price can't be negative").default(0),
  isPopular: z.boolean().default(false),
});

export const updateAddOnSchema = z.object({
  addOnId: z.string().min(1),
  name: z.string().trim().min(1, "Enter an option name").max(80),
  priceDelta: z.coerce.number().min(0, "Extra price can't be negative").default(0),
  isPopular: z.boolean().default(false),
});
