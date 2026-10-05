-- Additive only: new nullable/defaulted columns and new tables. Old running
-- code never references any of these, so this is safe to apply while the
-- previous build is still live during the deploy window.

-- Free-text ingredients and allergens on a menu item.
ALTER TABLE "MenuItem" ADD COLUMN "ingredients" TEXT;
ALTER TABLE "MenuItem" ADD COLUMN "allergens" TEXT;

-- Up to 4 photos per menu item (enforced in the application layer, not here).
CREATE TABLE "MenuItemPhoto" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MenuItemPhoto_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "MenuItemPhoto" ADD CONSTRAINT "MenuItemPhoto_menuItemId_fkey"
    FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "MenuItemPhoto_menuItemId_idx" ON "MenuItemPhoto"("menuItemId");

-- "Frequently bought together": up to 10 other items from the same
-- restaurant that the owner suggests alongside this one.
CREATE TABLE "MenuItemSuggestion" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "suggestedItemId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MenuItemSuggestion_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "MenuItemSuggestion" ADD CONSTRAINT "MenuItemSuggestion_menuItemId_fkey"
    FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MenuItemSuggestion" ADD CONSTRAINT "MenuItemSuggestion_suggestedItemId_fkey"
    FOREIGN KEY ("suggestedItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "MenuItemSuggestion_menuItemId_suggestedItemId_key" ON "MenuItemSuggestion"("menuItemId", "suggestedItemId");

-- Option group min-choices, alongside the existing maxSelect, so a vendor can
-- set e.g. "select between 2 and 4". Backfilled from the existing
-- isRequired flag so already-required groups keep their current "must pick
-- at least 1" behavior unchanged.
ALTER TABLE "AddOnGroup" ADD COLUMN "minSelect" INTEGER NOT NULL DEFAULT 0;
UPDATE "AddOnGroup" SET "minSelect" = 1 WHERE "isRequired" = true;

-- Per-choice "Popular" tag and an on/off availability switch (so a vendor can
-- 86 a single topping without deleting it).
ALTER TABLE "AddOn" ADD COLUMN "isPopular" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AddOn" ADD COLUMN "isAvailable" BOOLEAN NOT NULL DEFAULT true;

-- "If this item is not available" choice ("REMOVE" | "CALL"), carried from
-- cart through to the order.
ALTER TABLE "CartItem" ADD COLUMN "unavailableAction" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "unavailableAction" TEXT;
