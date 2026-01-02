-- Add dispatch settings to organizations for intelligent SMS dispatch
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sms_throttle_rate_seconds INTEGER DEFAULT 3;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS send_window_start INTEGER DEFAULT 8;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS send_window_end INTEGER DEFAULT 21;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS send_window_timezone VARCHAR(50) DEFAULT 'UTC';
