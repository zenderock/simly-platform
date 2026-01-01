-- Add retry tracking to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS max_retries INT NOT NULL DEFAULT 3;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Index for scheduled and processing messages to optimize retry/scheduler polling
CREATE INDEX IF NOT EXISTS idx_messages_retry_status ON messages(status, retry_count) WHERE status IN ('pending', 'failed', 'scheduled');
