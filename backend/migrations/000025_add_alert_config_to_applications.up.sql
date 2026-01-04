ALTER TABLE applications ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS ntfy_topic TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS alert_settings JSONB DEFAULT '{}';
