-- Restore plan name 'free' and correct limits (1 device, 100 SMS)
UPDATE organizations SET plan = 'free' WHERE plan = 'starter';

-- Update limits for free plan to match product vision (1 device, 100 SMS)
UPDATE organizations SET 
    max_devices = 1,
    sms_monthly_limit = 100,
    sms_burst_limit = 10 -- Vision implies limited frequency, burst 10 is reasonable for 1/10s?
WHERE plan = 'free';

-- Reset defaults for new organizations
ALTER TABLE organizations 
    ALTER COLUMN plan SET DEFAULT 'free',
    ALTER COLUMN max_devices SET DEFAULT 1,
    ALTER COLUMN sms_monthly_limit SET DEFAULT 100,
    ALTER COLUMN sms_burst_limit SET DEFAULT 10;
