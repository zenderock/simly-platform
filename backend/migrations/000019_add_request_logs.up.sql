CREATE TABLE IF NOT EXISTS request_logs (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    api_key_id INTEGER NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(512) NOT NULL,
    status_code INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    request_body TEXT,
    response_body TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups by organization
CREATE INDEX idx_request_logs_org_id ON request_logs(organization_id);

-- Index for filtering by created_at (for recent logs queries)
CREATE INDEX idx_request_logs_created_at ON request_logs(created_at DESC);

-- Composite index for common query pattern: org + created_at
CREATE INDEX idx_request_logs_org_created ON request_logs(organization_id, created_at DESC);
