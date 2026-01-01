DROP INDEX IF EXISTS idx_messages_retry_status;
ALTER TABLE messages DROP COLUMN IF EXISTS retry_count;
ALTER TABLE messages DROP COLUMN IF EXISTS max_retries;
ALTER TABLE messages DROP COLUMN IF EXISTS last_error;
ALTER TABLE messages DROP COLUMN IF EXISTS metadata;
