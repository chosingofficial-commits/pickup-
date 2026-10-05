import { describe, it, expect } from "vitest";
import { menuItemSchema, updateMenuItemSchema } from "./menu-item";

/**
 * Regression test for a bug where "Add item" on /vendor/menu silently did
 * nothing when only name + price were filled in. The add-item form doesn't
 * render ingredients/allergens inputs (those are edit-only), so
 * FormData.get() returns `null` for those keys — and `.optional()` only
 * accepts `undefined`, not `null`, so the whole parse failed with no visible
 * error (the form didn't render the generic error banner either, which is
 * fixed separately). This locks in that a create with only name + price
 * (every other field absent, i.e. `null` the way FormData.get() returns it)
 * must succeed.
 */
describe("menuItemSchema", () => {
  it("accepts a create with only menuId, name, and price — every optional field absent as null", () => {
    const result = menuItemSchema.safeParse({
      menuId: "menu-1",
      name: "Dinner Special",
      description: null,
      price: "250",
      compareAtPrice: null,
      imageUrl: null,
      ingredients: null,
      allergens: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Dinner Special");
      expect(result.data.price).toBe(250);
      expect(result.data.description).toBeUndefined();
      expect(result.data.compareAtPrice).toBeUndefined();
      expect(result.data.imageUrl).toBeUndefined();
      expect(result.data.ingredients).toBeUndefined();
      expect(result.data.allergens).toBeUndefined();
    }
  });

  it("still rejects a compareAtPrice that isn't higher than price", () => {
    const result = menuItemSchema.safeParse({
      menuId: "menu-1",
      name: "Dinner Special",
      description: null,
      price: "250",
      compareAtPrice: "200",
      imageUrl: null,
      ingredients: null,
      allergens: null,
    });
    expect(result.success).toBe(false);
  });

  it("still rejects a missing name", () => {
    const result = menuItemSchema.safeParse({
      menuId: "menu-1",
      name: "",
      description: null,
      price: "250",
      compareAtPrice: null,
      imageUrl: null,
      ingredients: null,
      allergens: null,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateMenuItemSchema", () => {
  it("accepts an update with every optional field absent as null", () => {
    const result = updateMenuItemSchema.safeParse({
      itemId: "item-1",
      name: "Dinner Special",
      description: null,
      price: "250",
      compareAtPrice: null,
      ingredients: null,
      allergens: null,
    });
    expect(result.success).toBe(true);
  });
});
