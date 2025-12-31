-- usage_ledger table tracks usage per application per period (e.g. month-year)
CREATE TABLE IF NOT EXISTS usage_ledger (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    period VARCHAR(7) NOT NULL, -- "2024-01"
    sms_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(application_id, period)
);

-- Add rate limit configuration to organizations (Plan limits)
ALTER TABLE organizations 
    ADD COLUMN sms_monthly_limit INTEGER DEFAULT 100, -- Free tier default
    ADD COLUMN sms_burst_limit INTEGER DEFAULT 5;     -- 5 SMS per second/minute bucket capacity

-- Add current usage to applications for quick cache-like access (optional, but ledger is source of truth)
-- keeping it simple with ledger for now.
