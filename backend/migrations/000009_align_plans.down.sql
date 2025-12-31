-- Revert plan names: starter -> free, professional -> pro
UPDATE organizations SET plan = 'free' WHERE plan = 'starter';
UPDATE organizations SET plan = 'pro' WHERE plan = 'professional';

-- Revert to old defaults
ALTER TABLE organizations 
    ALTER COLUMN plan SET DEFAULT 'free',
    ALTER COLUMN sms_monthly_limit SET DEFAULT 100,
    ALTER COLUMN sms_burst_limit SET DEFAULT 5,
    ALTER COLUMN max_devices SET DEFAULT 1,
    ALTER COLUMN max_sims_per_device SET DEFAULT 1;
