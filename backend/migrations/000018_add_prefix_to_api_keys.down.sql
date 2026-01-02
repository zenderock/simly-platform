-- Remove prefix and updated_at columns from api_keys table
ALTER TABLE api_keys DROP COLUMN IF EXISTS prefix;
ALTER TABLE api_keys DROP COLUMN IF EXISTS updated_at;