-- Separate migration from the enum additions in 20260929150000 — a new enum
-- value can't be referenced by other statements in the same transaction it
-- was added in, so this has to be its own migration, applied after that one
-- commits.

INSERT INTO "AdPlacement" (id, code, name, description, "desktopWidth", "desktopHeight", "mobileWidth", "mobileHeight", "isActive")
VALUES
  ('adplacement_homepage_carousel', 'HOMEPAGE_CAROUSEL', 'Homepage carousel', 'Rotating ad carousel below the hero section on the homepage.', 1200, 600, 800, 400, true),
  ('adplacement_marketplace_top', 'MARKETPLACE_TOP', 'Marketplace top carousel', 'Rotating ad carousel at the top of the marketplace page.', 1200, 600, 800, 400, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO "AdPricing" (id, "placementId", "billingCycle", price, "isActive")
VALUES
  ('adpricing_homepage_daily', 'adplacement_homepage_carousel', 'DAILY', 800, true),
  ('adpricing_homepage_weekly', 'adplacement_homepage_carousel', 'WEEKLY', 4500, true),
  ('adpricing_homepage_monthly', 'adplacement_homepage_carousel', 'MONTHLY', 15000, true),
  ('adpricing_marketplace_daily', 'adplacement_marketplace_top', 'DAILY', 500, true),
  ('adpricing_marketplace_weekly', 'adplacement_marketplace_top', 'WEEKLY', 2800, true),
  ('adpricing_marketplace_monthly', 'adplacement_marketplace_top', 'MONTHLY', 9500, true)
ON CONFLICT ("placementId", "billingCycle") DO NOTHING;

-- Deactivate (not delete) the old scattered single-image placements — their
-- AdPlacement/AdCampaign/AdPayment history is preserved, they just no
-- longer accept new campaigns via the redesigned /advertise form, and admin
-- can always re-enable one from Placements & pricing if needed.
UPDATE "AdPlacement" SET "isActive" = false
WHERE code IN ('HERO_BANNER','BELOW_CATEGORIES_BANNER','BETWEEN_SECTIONS_BANNER','RESTAURANT_PROMO_BANNER','SIDEBAR_BANNER','MOBILE_PROMO_CARD','SPONSORED_VENDOR','SPONSORED_RESTAURANT');
