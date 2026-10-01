-- Additive only. All new columns are nullable or defaulted, so the
-- currently-deployed (pre-variants) code — which never reads or writes any
-- of them — keeps working unmodified while this migration runs and until
-- the new build finishes deploying right after it (see PLAN-product-variants
-- for the full reasoning).

-- CreateEnum
CREATE TYPE "VariantUnit" AS ENUM ('ML', 'L', 'G', 'KG', 'PCS', 'PACK', 'DOZEN');

-- AlterTable
ALTER TABLE "ProductVariant"
  ADD COLUMN "quantityValue" DECIMAL(10,3),
  ADD COLUMN "unit" "VariantUnit",
  ADD COLUMN "packCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "price" DECIMAL(10,2),
  ADD COLUMN "compareAtPrice" DECIMAL(10,2),
  ADD COLUMN "sku" TEXT,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "imageId" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_imageId_fkey"
  FOREIGN KEY ("imageId") REFERENCES "ProductImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "ProductVariant_productId_isActive_idx" ON "ProductVariant"("productId", "isActive");
