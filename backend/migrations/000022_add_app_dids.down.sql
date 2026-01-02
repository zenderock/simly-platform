-- Drop the app_dids table and related triggers/functions
DROP TRIGGER IF EXISTS update_app_dids_updated_at ON app_dids;
DROP FUNCTION IF EXISTS update_app_dids_updated_at();
DROP TABLE IF EXISTS app_dids;