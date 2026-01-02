-- Add table for Application DID (Virtual Numbers) mapping
CREATE TABLE IF NOT EXISTS app_dids (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    did_number VARCHAR(20) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure each DID number is unique across the system
    UNIQUE(did_number)
);

-- Add indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_app_dids_did_number ON app_dids (did_number);
CREATE INDEX IF NOT EXISTS idx_app_dids_application_id ON app_dids (application_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_app_dids_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_app_dids_updated_at
    BEFORE UPDATE ON app_dids
    FOR EACH ROW
    EXECUTE FUNCTION update_app_dids_updated_at();