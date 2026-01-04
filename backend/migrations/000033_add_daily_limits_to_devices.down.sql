ALTER TABLE devices DROP COLUMN IF EXISTS daily_limit;
ALTER TABLE devices DROP COLUMN IF EXISTS sent_today;
ALTER TABLE devices DROP COLUMN IF EXISTS last_reset_date;
