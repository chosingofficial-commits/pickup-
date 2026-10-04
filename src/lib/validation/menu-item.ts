import { z } from "zod";

export const menuSchema = z.object({ name: z.string().trim().min(2, "Enter a menu name").max(80) });

export const menuItemSchema = z
  .object({
    menuId: z.string().min(1),
    name: z.string().trim().min(2, "Enter an item name").max(120),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    price: z.coerce.number().positive("Enter a valid price"),
    compareAtPrice: z.coerce.number().positive().optional().or(z.literal("").transform(() => undefined)),
    imageUrl: z.string().url().optional().or(z.literal("")),
  })
  .refine((data) => data.compareAtPrice == null || data.compareAtPrice > data.price, {
    message: "Old price must be higher than the current price.",
    path: ["compareAtPrice"],
  });

export const updateMenuItemSchema = z
  .object({
    itemId: z.string().min(1),
    name: z.string().trim().min(2, "Enter an item name").max(120),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    price: z.coerce.number().positive("Enter a valid price"),
    compareAtPrice: z.coerce.number().positive().optional().or(z.literal("").transform(() => undefined)),
  })
  .refine((data) => data.compareAtPrice == null || data.compareAtPrice > data.price, {
    message: "Old price must be higher than the current price.",
    path: ["compareAtPrice"],
  });

export const addOnGroupSchema = z.object({
  menuItemId: z.string().min(1),
  name: z.string().trim().min(2, "Enter a group name (e.g. Size)").max(80),
  isRequired: z.boolean(),
  maxSelect: z.coerce.number().int().min(1, "Max choices must be at least 1").max(20),
});

export const addOnSchema = z.object({
  groupId: z.string().min(1),
  name: z.string().trim().min(1, "Enter an option name").max(80),
  priceDelta: z.coerce.number().min(0, "Extra price can't be negative").default(0),
});
