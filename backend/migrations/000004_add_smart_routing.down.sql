DROP INDEX IF EXISTS idx_messages_priority_created;
ALTER TABLE messages DROP COLUMN IF EXISTS required_tags;
ALTER TABLE messages DROP COLUMN IF EXISTS priority;
ALTER TABLE devices DROP COLUMN IF EXISTS tags;
