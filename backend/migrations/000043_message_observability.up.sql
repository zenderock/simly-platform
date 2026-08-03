ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS last_error_code VARCHAR(100),
    ADD COLUMN IF NOT EXISTS failure_category VARCHAR(50),
    ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS last_attempted_at TIMESTAMP WITH TIME ZONE;

DO $$
DECLARE
    target_table text;
    has_bad_ids boolean;
BEGIN
    FOREACH target_table IN ARRAY ARRAY['messages', 'organizations', 'applications', 'devices'] LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            JOIN unnest(c.conkey) WITH ORDINALITY AS keys(attnum, ord) ON TRUE
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = keys.attnum
            WHERE n.nspname = current_schema()
              AND t.relname = target_table
              AND c.contype IN ('p', 'u')
            GROUP BY c.oid
            HAVING array_agg(a.attname ORDER BY keys.ord) = ARRAY['id'::name]
        ) THEN
            EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE id IS NULL)', target_table) INTO has_bad_ids;
            IF has_bad_ids THEN
                RAISE EXCEPTION 'cannot add unique constraint on %.id because NULL ids exist', target_table;
            END IF;

            EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I GROUP BY id HAVING COUNT(*) > 1)', target_table) INTO has_bad_ids;
            IF has_bad_ids THEN
                RAISE EXCEPTION 'cannot add unique constraint on %.id because duplicate ids exist', target_table;
            END IF;

            EXECUTE format('ALTER TABLE %I ALTER COLUMN id SET NOT NULL', target_table);
            EXECUTE format(
                'ALTER TABLE %I ADD CONSTRAINT %I UNIQUE (id)',
                target_table,
                target_table || '_id_unique_for_message_events'
            );
        END IF;
    END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS message_events (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
    device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
    sim_slot INTEGER,
    event_type VARCHAR(50) NOT NULL,
    status VARCHAR(20),
    attempt INTEGER NOT NULL DEFAULT 0,
    source VARCHAR(50) NOT NULL,
    reason_code VARCHAR(100),
    reason_message TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_events_message_created ON message_events(message_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_message_events_org_created ON message_events(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_events_event_type ON message_events(event_type);
CREATE INDEX IF NOT EXISTS idx_messages_org_status_created ON messages(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_org_failure_created ON messages(organization_id, failure_category, created_at DESC) WHERE failure_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_org_error_code_created ON messages(organization_id, last_error_code, created_at DESC) WHERE last_error_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_org_to_number_created ON messages(organization_id, to_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_support_created ON messages(created_at DESC);
