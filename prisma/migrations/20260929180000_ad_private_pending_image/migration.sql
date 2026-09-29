-- Additive only. Ad images now upload to the private bucket first
-- (never publicly reachable before approval) and get copied to the public
-- bucket only on approval — this column tracks the private key in between.
ALTER TABLE "Advertisement" ADD COLUMN "pendingBannerImageKey" TEXT;
