-- Table for device linking tokens (QR code flow)
CREATE TABLE IF NOT EXISTS device_link_tokens (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_device_link_tokens_token ON device_link_tokens(token);
CREATE INDEX idx_device_link_tokens_org ON device_link_tokens(organization_id);
