-- Additive only. Default of 6 applies to existing placement rows too.
ALTER TABLE "AdPlacement" ADD COLUMN "maxConcurrentAds" INTEGER NOT NULL DEFAULT 6;
