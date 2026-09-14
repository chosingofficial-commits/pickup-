import { z } from "zod";

export const menuSchema = z.object({ name: z.string().trim().min(2, "Enter a menu name").max(80) });

export const menuItemSchema = z.object({
  menuId: z.string().min(1),
  name: z.string().trim().min(2, "Enter an item name").max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  price: z.coerce.number().positive("Enter a valid price"),
  imageUrl: z.string().url().optional().or(z.literal("")),
});
