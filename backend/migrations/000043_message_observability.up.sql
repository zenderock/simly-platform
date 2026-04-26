ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS last_error_code VARCHAR(100),
    ADD COLUMN IF NOT EXISTS failure_category VARCHAR(50),
    ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS last_attempted_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS message_events (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
    device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
    sim_slot INTEGER,
    event_type VARCHAR(50) NOT NULL,
    status VARCHAR(20),
    attempt INTEGER NOT NULL DEFAULT 0,
    source VARCHAR(50) NOT NULL,
    reason_code VARCHAR(100),
    reason_message TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_events_message_created ON message_events(message_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_message_events_org_created ON message_events(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_events_event_type ON message_events(event_type);
CREATE INDEX IF NOT EXISTS idx_messages_org_status_created ON messages(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_org_failure_created ON messages(organization_id, failure_category, created_at DESC) WHERE failure_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_org_error_code_created ON messages(organization_id, last_error_code, created_at DESC) WHERE last_error_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_org_to_number_created ON messages(organization_id, to_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_support_created ON messages(created_at DESC);
