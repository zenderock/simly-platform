-- Remove dispatch settings from organizations
ALTER TABLE organizations DROP COLUMN IF EXISTS sms_throttle_rate_seconds;
ALTER TABLE organizations DROP COLUMN IF EXISTS send_window_start;
ALTER TABLE organizations DROP COLUMN IF EXISTS send_window_end;
ALTER TABLE organizations DROP COLUMN IF EXISTS send_window_timezone;
