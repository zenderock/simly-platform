-- Align plan names: free -> starter, pro -> professional
UPDATE organizations SET plan = 'starter' WHERE plan = 'free';
UPDATE organizations SET plan = 'professional' WHERE plan = 'pro';

-- Update limits based on new plan structure
-- Starter: 1,000 SMS/month, 2 devices, 1 SIM/device, 100 burst
UPDATE organizations SET 
    sms_monthly_limit = 1000,
    sms_burst_limit = 100,
    max_devices = 2,
    max_sims_per_device = 1
WHERE plan = 'starter';

-- Professional: 10,000 SMS/month, 10 devices, 2 SIMs/device, 500 burst
UPDATE organizations SET 
    sms_monthly_limit = 10000,
    sms_burst_limit = 500,
    max_devices = 10,
    max_sims_per_device = 2
WHERE plan = 'professional';

-- Enterprise: 50,000 SMS/month, unlimited devices (-1), 4 SIMs/device, 2000 burst
UPDATE organizations SET 
    sms_monthly_limit = 50000,
    sms_burst_limit = 2000,
    max_devices = -1,
    max_sims_per_device = 4
WHERE plan = 'enterprise';

-- Update default values for new organizations (starter plan)
ALTER TABLE organizations 
    ALTER COLUMN plan SET DEFAULT 'starter',
    ALTER COLUMN sms_monthly_limit SET DEFAULT 1000,
    ALTER COLUMN sms_burst_limit SET DEFAULT 100,
    ALTER COLUMN max_devices SET DEFAULT 2,
    ALTER COLUMN max_sims_per_device SET DEFAULT 1;
