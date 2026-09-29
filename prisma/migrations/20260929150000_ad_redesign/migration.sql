-- Ad redesign: additive-only.
-- 1. Two new placement codes for the redesigned carousel — the old 8 codes
--    stay in the enum and their AdPlacement/AdCampaign/AdPayment rows are
--    untouched (only deactivated via isActive, in application code/data,
--    not this migration), so existing campaign/payment history is preserved.
ALTER TYPE "AdPlacementCode" ADD VALUE 'HOMEPAGE_CAROUSEL';
ALTER TYPE "AdPlacementCode" ADD VALUE 'MARKETPLACE_TOP';

-- 2. A PAUSED campaign status, for "pause anytime" without cancelling.
ALTER TYPE "AdStatus" ADD VALUE 'PAUSED';

-- 3. The redesigned /advertise form only asks for a phone number, not email —
--    relax the NOT NULL constraint (existing rows keep their real emails).
ALTER TABLE "Advertiser" ALTER COLUMN "email" DROP NOT NULL;
