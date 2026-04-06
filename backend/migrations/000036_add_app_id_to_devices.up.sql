ALTER TABLE devices ADD COLUMN IF NOT EXISTS application_id INTEGER REFERENCES applications(id);
CREATE INDEX IF NOT EXISTS idx_devices_application_id ON devices(application_id);

ALTER TABLE device_link_tokens ADD COLUMN IF NOT EXISTS application_id INTEGER REFERENCES applications(id);
CREATE INDEX IF NOT EXISTS idx_device_link_tokens_application_id ON device_link_tokens(application_id);
