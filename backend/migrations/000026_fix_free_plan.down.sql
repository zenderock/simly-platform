-- Revert 'free' to 'starter'
UPDATE organizations SET plan = 'starter' WHERE plan = 'free';

-- Revert limits to 'starter' specs (2 devices, 1000 SMS)
UPDATE organizations SET 
    max_devices = 2,
    sms_monthly_limit = 1000,
    sms_burst_limit = 100
WHERE plan = 'starter';

-- Restore defaults
ALTER TABLE organizations 
    ALTER COLUMN plan SET DEFAULT 'starter',
    ALTER COLUMN max_devices SET DEFAULT 2,
    ALTER COLUMN sms_monthly_limit SET DEFAULT 1000,
    ALTER COLUMN sms_burst_limit SET DEFAULT 100;
