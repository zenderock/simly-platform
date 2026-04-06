ALTER TABLE devices ADD COLUMN IF NOT EXISTS requires_setup BOOLEAN DEFAULT TRUE;
UPDATE devices SET requires_setup = FALSE WHERE EXISTS (
    SELECT 1 FROM device_sims WHERE device_sims.device_id = devices.id AND supported_prefixes != ''
);
