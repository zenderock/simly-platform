-- Add dispatch settings to campaigns for intelligent SMS dispatch
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS send_window_start INTEGER;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS send_window_end INTEGER;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS pause_reason VARCHAR(50);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS estimated_completion_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS use_all_devices BOOLEAN DEFAULT false;
