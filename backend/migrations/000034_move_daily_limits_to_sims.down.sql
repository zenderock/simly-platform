-- Re-add columns to devices
ALTER TABLE devices ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 150;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS sent_today INTEGER DEFAULT 0;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_reset_date DATE DEFAULT CURRENT_DATE;

-- Restore data from SIM 1 (slot 0)
UPDATE devices d
SET daily_limit = s.daily_limit, sent_today = s.sent_today, last_reset_date = s.last_reset_date
FROM device_sims s
WHERE s.device_id = d.id AND s.slot_index = 0;

-- Drop columns from device_sims
ALTER TABLE device_sims DROP COLUMN IF EXISTS daily_limit;
ALTER TABLE device_sims DROP COLUMN IF EXISTS sent_today;
ALTER TABLE device_sims DROP COLUMN IF EXISTS last_reset_date;
