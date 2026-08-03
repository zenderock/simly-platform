DO $$
DECLARE
    sequence_regclass text := format('%I.%I', current_schema(), 'device_sims_id_seq');
    has_bad_ids boolean;
    max_id bigint;
    id_default text;
BEGIN
    IF to_regclass(format('%I.%I', current_schema(), 'device_sims')) IS NULL THEN
        RETURN;
    END IF;

    SELECT EXISTS (SELECT 1 FROM device_sims WHERE id IS NULL) INTO has_bad_ids;
    IF has_bad_ids THEN
        RAISE EXCEPTION 'cannot repair device_sims.id because NULL ids exist';
    END IF;

    SELECT EXISTS (SELECT 1 FROM device_sims GROUP BY id HAVING COUNT(*) > 1) INTO has_bad_ids;
    IF has_bad_ids THEN
        RAISE EXCEPTION 'cannot repair device_sims.id because duplicate ids exist';
    END IF;

    ALTER TABLE device_sims ALTER COLUMN id SET NOT NULL;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN unnest(c.conkey) WITH ORDINALITY AS keys(attnum, ord) ON TRUE
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = keys.attnum
        WHERE n.nspname = current_schema()
          AND t.relname = 'device_sims'
          AND c.contype IN ('p', 'u')
        GROUP BY c.oid
        HAVING array_agg(a.attname ORDER BY keys.ord) = ARRAY['id'::name]
    ) THEN
        ALTER TABLE device_sims
            ADD CONSTRAINT device_sims_id_unique_repair UNIQUE (id);
    END IF;

    SELECT column_default
    INTO id_default
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'device_sims'
      AND column_name = 'id';

    IF id_default IS NULL THEN
        CREATE SEQUENCE IF NOT EXISTS device_sims_id_seq;
        ALTER SEQUENCE device_sims_id_seq OWNED BY device_sims.id;
        ALTER TABLE device_sims
            ALTER COLUMN id SET DEFAULT nextval('device_sims_id_seq'::regclass);
        SELECT COALESCE(MAX(id), 0) FROM device_sims INTO max_id;
        PERFORM setval(sequence_regclass::regclass, GREATEST(max_id, 1), max_id > 0);
    END IF;
END $$;
