-- Additive, nullable column — safe to run while the old code (which never
-- references this column) is still live during the deploy window.
ALTER TABLE "Delivery" ADD COLUMN "riderSearchStartedAt" TIMESTAMP(3);
