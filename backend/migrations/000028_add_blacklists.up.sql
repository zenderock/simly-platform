CREATE TABLE blacklists (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    phone_number VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, phone_number)
);

CREATE INDEX idx_blacklists_org_phone ON blacklists(organization_id, phone_number);
