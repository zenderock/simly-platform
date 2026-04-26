DROP INDEX IF EXISTS idx_messages_support_created;
DROP INDEX IF EXISTS idx_messages_org_to_number_created;
DROP INDEX IF EXISTS idx_messages_org_error_code_created;
DROP INDEX IF EXISTS idx_messages_org_failure_created;
DROP INDEX IF EXISTS idx_messages_org_status_created;
DROP INDEX IF EXISTS idx_message_events_event_type;
DROP INDEX IF EXISTS idx_message_events_org_created;
DROP INDEX IF EXISTS idx_message_events_message_created;

DROP TABLE IF EXISTS message_events;

ALTER TABLE messages
    DROP COLUMN IF EXISTS last_attempted_at,
    DROP COLUMN IF EXISTS failed_at,
    DROP COLUMN IF EXISTS failure_category,
    DROP COLUMN IF EXISTS last_error_code;

ALTER TABLE users
    DROP COLUMN IF EXISTS is_platform_admin;
