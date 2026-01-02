-- Rollback migration for pay-per-use pricing model
-- Remove feature limit columns and usage tracking table

-- Drop usage_records table
DROP TABLE IF EXISTS usage_records;

-- Remove feature limit columns from organizations
ALTER TABLE organizations 
    DROP COLUMN IF EXISTS max_applications,
    DROP COLUMN IF EXISTS max_contacts,
    DROP COLUMN IF EXISTS max_campaigns,
    DROP COLUMN IF EXISTS max_recipients_per_campaign;