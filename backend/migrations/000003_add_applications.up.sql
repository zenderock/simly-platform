CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_applications_org_id ON applications(organization_id);

-- Update API Keys to belong to an Application
ALTER TABLE api_keys 
    ADD COLUMN application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE;

-- Update Webhooks to belong to an Application
ALTER TABLE webhooks 
    ADD COLUMN application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE;

-- Update Messages to belong to an Application (Nullable for now for system messages)
ALTER TABLE messages 
    ADD COLUMN application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL;
