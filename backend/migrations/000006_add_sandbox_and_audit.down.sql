DROP TABLE IF EXISTS audit_logs;
ALTER TABLE applications DROP COLUMN IF EXISTS is_sandbox;
