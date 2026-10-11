-- Additive only: a new enum and one new nullable column on Vendor. No
-- existing table/column/constraint is touched. Existing vendors get
-- shopType = NULL (shown as "Other"/unset on shop cards until the vendor
-- or an admin picks one).

-- CreateEnum
CREATE TYPE "ShopType" AS ENUM ('GROCERY', 'FRESH_MARKET', 'BAKERY', 'PHARMACY', 'CONVENIENCE', 'HEALTH_BEAUTY', 'ELECTRONICS', 'HOME_GIFTS', 'CLOTHING', 'FLOWERS', 'DRINKS', 'OTHER');

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN "shopType" "ShopType";
