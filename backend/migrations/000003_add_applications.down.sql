ALTER TABLE messages DROP COLUMN IF EXISTS application_id;
ALTER TABLE webhooks DROP COLUMN IF EXISTS application_id;
ALTER TABLE api_keys DROP COLUMN IF EXISTS application_id;

DROP TABLE IF EXISTS applications;
