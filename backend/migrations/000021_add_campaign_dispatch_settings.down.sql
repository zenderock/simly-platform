-- Remove dispatch settings from campaigns
ALTER TABLE campaigns DROP COLUMN IF EXISTS send_window_start;
ALTER TABLE campaigns DROP COLUMN IF EXISTS send_window_end;
ALTER TABLE campaigns DROP COLUMN IF EXISTS pause_reason;
ALTER TABLE campaigns DROP COLUMN IF EXISTS estimated_completion_at;
ALTER TABLE campaigns DROP COLUMN IF EXISTS use_all_devices;
