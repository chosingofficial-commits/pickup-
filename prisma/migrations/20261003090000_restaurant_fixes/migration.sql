-- Additive, nullable columns — safe to run while the old code (which never
-- references either column) is still live during the deploy window.

-- Optional "old price" on a menu item, shown crossed out next to the
-- current price (same idea as Product.compareAtPrice).
ALTER TABLE "MenuItem" ADD COLUMN "compareAtPrice" DECIMAL(10,2);

-- Structured weekly-hours replacement for the free-text openingHoursText on
-- a restaurant vendor application. Existing applications simply have NULL
-- here and keep using openingHoursText; new ones populate this instead.
ALTER TABLE "VendorApplication" ADD COLUMN "weeklyHoursJson" JSONB;
