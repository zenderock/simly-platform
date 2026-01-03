ALTER TABLE applications DROP COLUMN IF EXISTS slack_webhook_url;
ALTER TABLE applications DROP COLUMN IF EXISTS ntfy_topic;
ALTER TABLE applications DROP COLUMN IF EXISTS alert_settings;
