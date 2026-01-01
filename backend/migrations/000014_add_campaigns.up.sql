CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    template_body TEXT NOT NULL,
    list_id INTEGER REFERENCES contact_lists(id) ON DELETE SET NULL,
    device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, queueing, processing, completed, paused, cancelled
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    total_messages INTEGER DEFAULT 0,
    sent_messages INTEGER DEFAULT 0,
    failed_messages INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON messages(campaign_id);
