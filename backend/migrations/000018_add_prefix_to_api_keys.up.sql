-- Add prefix column to api_keys table for displaying partial keys
ALTER TABLE api_keys ADD COLUMN prefix VARCHAR(10);

-- Add updated_at column if it doesn't exist (referenced in store but not in original schema)
ALTER TABLE api_keys ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();