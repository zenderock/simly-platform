DO $$
DECLARE
    target_table text;
    sequence_name text;
    has_bad_ids boolean;
    max_id bigint;
BEGIN
    FOREACH target_table IN ARRAY ARRAY[
        'users',
        'organizations',
        'organization_members',
        'api_keys',
        'applications',
        'devices',
        'messages',
        'webhooks',
        'usage_records',
        'message_events'
    ] LOOP
        IF to_regclass(format('%I.%I', current_schema(), target_table)) IS NULL THEN
            CONTINUE;
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = target_table
              AND column_name = 'id'
        ) THEN
            CONTINUE;
        END IF;

        EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE id IS NULL)', target_table) INTO has_bad_ids;
        IF has_bad_ids THEN
            RAISE EXCEPTION 'cannot repair %.id because NULL ids exist', target_table;
        END IF;

        EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I GROUP BY id HAVING COUNT(*) > 1)', target_table) INTO has_bad_ids;
        IF has_bad_ids THEN
            RAISE EXCEPTION 'cannot repair %.id because duplicate ids exist', target_table;
        END IF;

        EXECUTE format('ALTER TABLE %I ALTER COLUMN id SET NOT NULL', target_table);

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
            EXECUTE format(
                'ALTER TABLE %I ADD CONSTRAINT %I UNIQUE (id)',
                target_table,
                target_table || '_id_unique_repair'
            );
        END IF;

        sequence_name := target_table || '_id_seq';
        EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I', sequence_name);
        EXECUTE format('ALTER SEQUENCE %I OWNED BY %I.id', sequence_name, target_table);
        EXECUTE format('ALTER TABLE %I ALTER COLUMN id SET DEFAULT nextval(%L::regclass)', target_table, sequence_name);
        EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I', target_table) INTO max_id;
        EXECUTE format('SELECT setval(%L::regclass, %s, %L)', sequence_name, GREATEST(max_id, 1), max_id > 0);
    END LOOP;
END $$;
