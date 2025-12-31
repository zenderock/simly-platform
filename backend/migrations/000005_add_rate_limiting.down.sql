ALTER TABLE organizations DROP COLUMN IF EXISTS sms_burst_limit;
ALTER TABLE organizations DROP COLUMN IF EXISTS sms_monthly_limit;
DROP TABLE IF EXISTS usage_ledger;
