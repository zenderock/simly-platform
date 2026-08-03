DO $$
DECLARE
    target_table text;
    sequence_name text;
    sequence_regclass text;
    has_bad_ids boolean;
    max_id bigint;
    id_default text;
    issues text[] := ARRAY[]::text[];
BEGIN
    FOREACH target_table IN ARRAY ARRAY[
        'users',
        'devices',
        'messages',
        'webhooks',
        'organizations',
        'organization_members',
        'api_keys',
        'applications',
        'usage_ledger',
        'audit_logs',
        'device_sims',
        'alerts',
        'device_link_tokens',
        'contacts',
        'contact_lists',
        'campaigns',
        'request_logs',
        'app_dids',
        'usage_records',
        'blacklists',
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

        EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I.%I WHERE id IS NULL)', current_schema(), target_table) INTO has_bad_ids;
        IF has_bad_ids THEN
            issues := array_append(issues, target_table || '.id has NULL values');
        END IF;

        EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I.%I GROUP BY id HAVING COUNT(*) > 1)', current_schema(), target_table) INTO has_bad_ids;
        IF has_bad_ids THEN
            issues := array_append(issues, target_table || '.id has duplicate values');
        END IF;
    END LOOP;

    IF array_length(issues, 1) > 0 THEN
        RAISE EXCEPTION 'unsafe id repair required: %', array_to_string(issues, '; ');
    END IF;

    FOREACH target_table IN ARRAY ARRAY[
        'users',
        'devices',
        'messages',
        'webhooks',
        'organizations',
        'organization_members',
        'api_keys',
        'applications',
        'usage_ledger',
        'audit_logs',
        'device_sims',
        'alerts',
        'device_link_tokens',
        'contacts',
        'contact_lists',
        'campaigns',
        'request_logs',
        'app_dids',
        'usage_records',
        'blacklists',
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

        EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN id SET NOT NULL', current_schema(), target_table);

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
                'ALTER TABLE %I.%I ADD CONSTRAINT %I UNIQUE (id)',
                current_schema(),
                target_table,
                target_table || '_id_unique_repair'
            );
        END IF;

        SELECT column_default
        INTO id_default
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = target_table
          AND column_name = 'id';

        sequence_regclass := pg_get_serial_sequence(format('%I.%I', current_schema(), target_table), 'id');

        IF sequence_regclass IS NULL AND id_default IS NULL THEN
            sequence_name := target_table || '_id_seq';
            sequence_regclass := format('%I.%I', current_schema(), sequence_name);
            EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I.%I', current_schema(), sequence_name);
            EXECUTE format('ALTER SEQUENCE %I.%I OWNED BY %I.%I.id', current_schema(), sequence_name, current_schema(), target_table);
            EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN id SET DEFAULT nextval(%L::regclass)', current_schema(), target_table, sequence_regclass);
        END IF;

        IF sequence_regclass IS NOT NULL THEN
            EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I.%I', current_schema(), target_table) INTO max_id;
            EXECUTE format('SELECT setval(%L::regclass, %s, %L)', sequence_regclass, GREATEST(max_id, 1), max_id > 0);
        END IF;
    END LOOP;
END $$;
