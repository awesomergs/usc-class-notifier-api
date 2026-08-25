-- Preserve watched-section payment and delivery history while allowing users
-- to stop future notifications and hide the section from their dashboard.
ALTER TABLE "WatchedSection" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "WatchedSection_studentId_cancelledAt_idx"
ON "WatchedSection"("studentId", "cancelledAt");
