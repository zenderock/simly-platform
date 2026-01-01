ALTER TABLE messages DROP COLUMN IF NOT EXISTS scheduled_at;
ALTER TABLE messages DROP COLUMN IF NOT EXISTS processed_at;
DROP INDEX IF EXISTS idx_messages_scheduled_status;
