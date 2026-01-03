ALTER TABLE applications ADD COLUMN slack_webhook_url TEXT;
ALTER TABLE applications ADD COLUMN ntfy_topic TEXT;
ALTER TABLE applications ADD COLUMN alert_settings JSONB DEFAULT '{}';
