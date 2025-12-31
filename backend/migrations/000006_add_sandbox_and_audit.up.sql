-- Sandbox Support
ALTER TABLE applications 
    ADD COLUMN is_sandbox BOOLEAN DEFAULT FALSE;

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Null if system action or deleted user
    action VARCHAR(50) NOT NULL,    -- e.g. "api_key.created", "device.deleted"
    target_resource VARCHAR(50),    -- e.g. "api_key", "webhook"
    target_id VARCHAR(50),          -- ID of the modified resource
    details JSONB DEFAULT '{}',     -- Metadata (e.g. "Simulated failure")
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);
