-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "monthlyFeeGbp" DECIMAL(12,2) NOT NULL DEFAULT 800,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "PlatformSettings" ("id", "monthlyFeeGbp", "settings", "updatedAt")
VALUES (
  'default',
  800,
  '{"platform":[{"key":"verify_agent_signups","label":"Verify new agent signups manually","checked":true,"enabled":true},{"key":"auto_archive_listings","label":"Auto-archive flagged listings after 7 days","checked":false,"enabled":true},{"key":"double_opt_in_leads","label":"Require double opt-in for new leads","checked":false,"enabled":false}],"features":[{"key":"lead_routing","label":"Lead routing automation","checked":true,"enabled":true},{"key":"listing_flagging","label":"Listing flagging","checked":false,"enabled":true},{"key":"agent_status_monitoring","label":"Agent status monitoring","checked":true,"enabled":false},{"key":"advanced_reporting","label":"Advanced reporting","checked":true,"enabled":false}]}',
  CURRENT_TIMESTAMP
);
