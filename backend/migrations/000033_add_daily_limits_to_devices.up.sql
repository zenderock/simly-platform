ALTER TABLE devices ADD COLUMN daily_limit INTEGER DEFAULT 150;
ALTER TABLE devices ADD COLUMN sent_today INTEGER DEFAULT 0;
ALTER TABLE devices ADD COLUMN last_reset_date DATE DEFAULT CURRENT_DATE;

COMMENT ON COLUMN devices.daily_limit IS 'Maximum number of SMS allowed per day';
COMMENT ON COLUMN devices.sent_today IS 'Number of SMS sent today';
COMMENT ON COLUMN devices.last_reset_date IS 'Date when sent_today was last reset';
