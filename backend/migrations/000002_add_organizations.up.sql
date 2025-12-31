-- Enable UUID extension if not enabled (useful for API keys or slugs if needed, though we use auto-increment IDs for now)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    plan VARCHAR(50) NOT NULL DEFAULT 'free', -- free, pro, enterprise
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE organization_members (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- owner, admin, member
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL, -- Store hashed key, return plain only once
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration of existing resources to Organizations
-- Since this is an early stage, we can't easily auto-migrate data without logic. 
-- For MVP dev environment, we might truncate or we can make organization_id nullable initially then fill it.
-- Strategy: Add columns, allow NULL, (in a real migration we'd backfill), then set NOT NULL.
-- For this "clean slate" dev phase, we will just alter them.

-- Users: Add Name and AvatarURL
ALTER TABLE users ADD COLUMN name VARCHAR(255);
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255);
-- Remove plan from users, as it's now on Organization level
ALTER TABLE users DROP COLUMN IF EXISTS plan;
-- Remove API Key from users, moved to api_keys table
ALTER TABLE users DROP COLUMN IF EXISTS api_key;


-- Devices: Link to Organization instead of User
ALTER TABLE devices ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
-- We keep user_id for "auditing" who created it? No, resources belong to Org. 
-- But we might want to know who registered it. Let's drop user_id for strict Org ownership to avoid confusion.
ALTER TABLE devices DROP COLUMN user_id;
-- Devices name should be unique per organization? Maybe not strictly required but good practice.


-- Messages: Link to Organization
ALTER TABLE messages ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE messages DROP COLUMN user_id;


-- Webhooks: Link to Organization
ALTER TABLE webhooks ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE webhooks ADD COLUMN secret VARCHAR(255); -- For signing payloads
ALTER TABLE webhooks DROP COLUMN user_id;
