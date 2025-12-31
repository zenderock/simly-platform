-- Add health stats and model to devices
ALTER TABLE devices ADD COLUMN IF NOT EXISTS model VARCHAR(255);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS battery_level INTEGER DEFAULT 0;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS signal_strength INTEGER DEFAULT 0;

-- Create SIM cards table
CREATE TABLE IF NOT EXISTS device_sims (
    id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    slot_index INTEGER NOT NULL DEFAULT 0, -- 0 for SIM1, 1 for SIM2
    phone_number VARCHAR(20),
    operator VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrate existing phone numbers if any
INSERT INTO device_sims (device_id, phone_number, is_active)
SELECT id, phone_number, TRUE FROM devices WHERE phone_number IS NOT NULL;

-- Now safe to drop phone_number from devices as it's normalized 
ALTER TABLE devices DROP COLUMN IF EXISTS phone_number;

-- Add plan limits to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_devices INTEGER DEFAULT 1;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_sims_per_device INTEGER DEFAULT 1;

-- Update defaults based on plans
UPDATE organizations SET max_devices = 1, max_sims_per_device = 1 WHERE plan = 'free';
UPDATE organizations SET max_devices = 3, max_sims_per_device = 2 WHERE plan = 'pro';
UPDATE organizations SET max_devices = 100, max_sims_per_device = 2 WHERE plan = 'enterprise';
