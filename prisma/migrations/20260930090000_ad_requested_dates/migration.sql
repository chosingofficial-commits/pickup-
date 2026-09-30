-- Additive only. Nullable — existing advertisements never had a requested
-- window stored on the row itself (it only lived in an audit log entry).
ALTER TABLE "Advertisement" ADD COLUMN "requestedStartDate" TIMESTAMP(3);
ALTER TABLE "Advertisement" ADD COLUMN "requestedEndDate" TIMESTAMP(3);
