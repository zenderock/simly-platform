ALTER TABLE organizations DROP COLUMN IF EXISTS max_sims_per_device;
ALTER TABLE organizations DROP COLUMN IF EXISTS max_devices;

-- Bring back phone_number to devices before dropping sims table
ALTER TABLE devices ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

UPDATE devices d 
SET phone_number = s.phone_number 
FROM device_sims s 
WHERE d.id = s.device_id AND s.slot_index = 0;

DROP TABLE IF EXISTS device_sims;

ALTER TABLE devices DROP COLUMN IF EXISTS signal_strength;
ALTER TABLE devices DROP COLUMN IF EXISTS battery_level;
ALTER TABLE devices DROP COLUMN IF EXISTS model;
