ALTER TABLE devices ADD COLUMN application_id INTEGER REFERENCES applications(id);
CREATE INDEX idx_devices_application_id ON devices(application_id);

ALTER TABLE device_link_tokens ADD COLUMN application_id INTEGER REFERENCES applications(id);
CREATE INDEX idx_device_link_tokens_application_id ON device_link_tokens(application_id);
