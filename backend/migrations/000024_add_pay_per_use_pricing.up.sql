-- Migration to implement pay-per-use pricing model
-- Add new feature limit columns to organizations table
-- Remove SMS monthly limit dependencies from existing queries

-- Add new feature limit columns to organizations
ALTER TABLE organizations 
    ADD COLUMN IF NOT EXISTS max_applications INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS max_contacts INTEGER DEFAULT 100,
    ADD COLUMN IF NOT EXISTS max_campaigns INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS max_recipients_per_campaign INTEGER DEFAULT 100;

-- Update feature limits based on existing plans
-- Starter plan (was free): 1 app, 100 contacts, 1 campaign, 100 recipients per campaign
UPDATE organizations SET 
    max_applications = 1,
    max_contacts = 100,
    max_campaigns = 1,
    max_recipients_per_campaign = 100
WHERE plan = 'starter' OR plan = 'free';

-- Professional plan (was pro): 5 apps, 1000 contacts, 5 campaigns, 1000 recipients per campaign
UPDATE organizations SET 
    max_applications = 5,
    max_contacts = 1000,
    max_campaigns = 5,
    max_recipients_per_campaign = 1000
WHERE plan = 'professional' OR plan = 'pro';

-- Enterprise plan: unlimited (-1) for all features
UPDATE organizations SET 
    max_applications = -1,
    max_contacts = -1,
    max_campaigns = -1,
    max_recipients_per_campaign = -1
WHERE plan = 'enterprise' OR plan = 'agency';

-- Create usage_records table for tracking per-SMS costs and other usage
CREATE TABLE IF NOT EXISTS usage_records (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
    message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
    usage_type VARCHAR(50) NOT NULL, -- 'sms', 'application', 'contact', 'campaign'
    cost DECIMAL(10,4) NOT NULL DEFAULT 0, -- Cost in cents with 4 decimal precision
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    period VARCHAR(7) NOT NULL, -- YYYY-MM format for billing aggregation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_usage_records_org_period ON usage_records(organization_id, period);
CREATE INDEX IF NOT EXISTS idx_usage_records_timestamp ON usage_records(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_records_usage_type ON usage_records(usage_type);

-- Set default feature limits for new organizations
ALTER TABLE organizations 
    ALTER COLUMN max_applications SET DEFAULT 1,
    ALTER COLUMN max_contacts SET DEFAULT 100,
    ALTER COLUMN max_campaigns SET DEFAULT 1,
    ALTER COLUMN max_recipients_per_campaign SET DEFAULT 100;

-- Note: We keep sms_monthly_limit column for backward compatibility during transition
-- It will be ignored by the new pricing logic but preserved for rollback safety
-- A future migration can remove it once the transition is complete and tested