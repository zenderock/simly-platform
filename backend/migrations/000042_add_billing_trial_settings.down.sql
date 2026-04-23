DROP TABLE IF EXISTS billing_trial_settings;

ALTER TABLE organizations
    DROP COLUMN IF EXISTS trial_consumed_at,
    DROP COLUMN IF EXISTS trial_consumed_plan_id;
