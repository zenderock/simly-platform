-- Add daily limit columns to device_sims
ALTER TABLE device_sims ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 150;
ALTER TABLE device_sims ADD COLUMN IF NOT EXISTS sent_today INTEGER DEFAULT 0;
ALTER TABLE device_sims ADD COLUMN IF NOT EXISTS last_reset_date DATE DEFAULT CURRENT_DATE;

-- Migrate existing limits from devices if any (optional, best effort)
-- We map device limit to SIM 1 (slot 0) if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'daily_limit') THEN
        UPDATE device_sims 
        SET daily_limit = d.daily_limit, sent_today = d.sent_today, last_reset_date = d.last_reset_date
        FROM devices d
        WHERE device_sims.device_id = d.id AND device_sims.slot_index = 0 AND d.daily_limit IS NOT NULL;
    END IF;
END $$;

-- Drop columns from devices table if they exist
ALTER TABLE devices DROP COLUMN IF EXISTS daily_limit;
ALTER TABLE devices DROP COLUMN IF EXISTS sent_today;
ALTER TABLE devices DROP COLUMN IF EXISTS last_reset_date;
