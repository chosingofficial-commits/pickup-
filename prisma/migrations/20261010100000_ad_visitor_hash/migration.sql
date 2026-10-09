-- Additive only: adds a nullable visitorHash column to AdImpression and
-- AdClick so repeated views/clicks from the same visitor within a short
-- window can be deduplicated without ever storing a raw IP address.
-- Existing rows keep visitorHash = NULL (they predate this and are never
-- treated as duplicates of anything).

-- AlterTable
ALTER TABLE "AdImpression" ADD COLUMN "visitorHash" TEXT;

-- AlterTable
ALTER TABLE "AdClick" ADD COLUMN "visitorHash" TEXT;

-- CreateIndex
CREATE INDEX "AdImpression_campaignId_visitorHash_occurredAt_idx" ON "AdImpression"("campaignId", "visitorHash", "occurredAt");

-- CreateIndex
CREATE INDEX "AdClick_campaignId_visitorHash_occurredAt_idx" ON "AdClick"("campaignId", "visitorHash", "occurredAt");
