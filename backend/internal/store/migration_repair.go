package store

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	"github.com/jackc/pgx/v5/pgxpool"
)

type additiveColumnMigration struct {
	version   uint
	repairSQL []string
	checks    []columnCheck
	indexes   []indexCheck
}

type columnCheck struct {
	table   string
	columns []string
}

type indexCheck struct {
	name      string
	createSQL string
}

var repairableAdditiveColumnMigrations = map[uint]additiveColumnMigration{
	25: {
		version: 25,
		checks: []columnCheck{
			{table: "applications", columns: []string{"slack_webhook_url", "ntfy_topic", "alert_settings"}},
		},
	},
	29: {
		version: 29,
		checks: []columnCheck{
			{table: "applications", columns: []string{"logo_url"}},
		},
	},
	30: {
		version: 30,
		checks: []columnCheck{
			{table: "users", columns: []string{"avatar_url"}},
		},
	},
	31: {
		version: 31,
		checks: []columnCheck{
			{table: "device_sims", columns: []string{"supported_prefixes"}},
		},
	},
	32: {
		version: 32,
		checks: []columnCheck{
			{table: "devices", columns: []string{"requires_setup"}},
		},
	},
	33: {
		version: 33,
		checks: []columnCheck{
			{table: "devices", columns: []string{"daily_limit", "sent_today", "last_reset_date"}},
		},
	},
	35: {
		version: 35,
		checks: []columnCheck{
			{table: "campaigns", columns: []string{"application_id"}},
			{table: "contacts", columns: []string{"application_id"}},
			{table: "contact_lists", columns: []string{"application_id"}},
		},
		indexes: []indexCheck{
			{name: "idx_campaigns_application_id", createSQL: "CREATE INDEX IF NOT EXISTS idx_campaigns_application_id ON campaigns(application_id)"},
			{name: "idx_contacts_application_id", createSQL: "CREATE INDEX IF NOT EXISTS idx_contacts_application_id ON contacts(application_id)"},
			{name: "idx_contact_lists_application_id", createSQL: "CREATE INDEX IF NOT EXISTS idx_contact_lists_application_id ON contact_lists(application_id)"},
		},
	},
	36: {
		version: 36,
		checks: []columnCheck{
			{table: "devices", columns: []string{"application_id"}},
			{table: "device_link_tokens", columns: []string{"application_id"}},
		},
		indexes: []indexCheck{
			{name: "idx_devices_application_id", createSQL: "CREATE INDEX IF NOT EXISTS idx_devices_application_id ON devices(application_id)"},
			{name: "idx_device_link_tokens_application_id", createSQL: "CREATE INDEX IF NOT EXISTS idx_device_link_tokens_application_id ON device_link_tokens(application_id)"},
		},
	},
	37: {
		version: 37,
		checks: []columnCheck{
			{table: "campaigns", columns: []string{"auto_reschedule"}},
		},
	},
	38: {
		version: 38,
		checks: []columnCheck{
			{table: "organizations", columns: []string{"auto_save_contacts"}},
		},
	},
	39: {
		version: 39,
		checks: []columnCheck{
			{table: "users", columns: []string{"password_reset_token", "password_reset_expires_at"}},
		},
	},
	43: {
		version: 43,
		repairSQL: []string{
			`ALTER TABLE users
				ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE`,
			`ALTER TABLE messages
				ADD COLUMN IF NOT EXISTS last_error_code VARCHAR(100),
				ADD COLUMN IF NOT EXISTS failure_category VARCHAR(50),
				ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP WITH TIME ZONE,
				ADD COLUMN IF NOT EXISTS last_attempted_at TIMESTAMP WITH TIME ZONE`,
			`DO $$
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
			END $$`,
			`CREATE TABLE IF NOT EXISTS message_events (
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
			)`,
		},
		checks: []columnCheck{
			{table: "users", columns: []string{"is_platform_admin"}},
			{table: "messages", columns: []string{"last_error_code", "failure_category", "failed_at", "last_attempted_at"}},
			{table: "message_events", columns: []string{
				"id",
				"message_id",
				"organization_id",
				"application_id",
				"device_id",
				"sim_slot",
				"event_type",
				"status",
				"attempt",
				"source",
				"reason_code",
				"reason_message",
				"metadata",
				"created_at",
			}},
		},
		indexes: []indexCheck{
			{name: "idx_message_events_message_created", createSQL: "CREATE INDEX IF NOT EXISTS idx_message_events_message_created ON message_events(message_id, created_at ASC)"},
			{name: "idx_message_events_org_created", createSQL: "CREATE INDEX IF NOT EXISTS idx_message_events_org_created ON message_events(organization_id, created_at DESC)"},
			{name: "idx_message_events_event_type", createSQL: "CREATE INDEX IF NOT EXISTS idx_message_events_event_type ON message_events(event_type)"},
			{name: "idx_messages_org_status_created", createSQL: "CREATE INDEX IF NOT EXISTS idx_messages_org_status_created ON messages(organization_id, status, created_at DESC)"},
			{name: "idx_messages_org_failure_created", createSQL: "CREATE INDEX IF NOT EXISTS idx_messages_org_failure_created ON messages(organization_id, failure_category, created_at DESC) WHERE failure_category IS NOT NULL"},
			{name: "idx_messages_org_error_code_created", createSQL: "CREATE INDEX IF NOT EXISTS idx_messages_org_error_code_created ON messages(organization_id, last_error_code, created_at DESC) WHERE last_error_code IS NOT NULL"},
			{name: "idx_messages_org_to_number_created", createSQL: "CREATE INDEX IF NOT EXISTS idx_messages_org_to_number_created ON messages(organization_id, to_number, created_at DESC)"},
			{name: "idx_messages_support_created", createSQL: "CREATE INDEX IF NOT EXISTS idx_messages_support_created ON messages(created_at DESC)"},
		},
	},
	45: {
		version: 45,
		repairSQL: []string{`
			DO $$
			DECLARE
				sequence_regclass text := format('%I.%I', current_schema(), 'device_link_tokens_id_seq');
				has_bad_ids boolean;
				max_id bigint;
				id_default text;
			BEGIN
				IF to_regclass(format('%I.%I', current_schema(), 'device_link_tokens')) IS NULL THEN
					RETURN;
				END IF;

				SELECT EXISTS (SELECT 1 FROM device_link_tokens WHERE id IS NULL) INTO has_bad_ids;
				IF has_bad_ids THEN
					RAISE EXCEPTION 'cannot repair device_link_tokens.id because NULL ids exist';
				END IF;

				SELECT EXISTS (SELECT 1 FROM device_link_tokens GROUP BY id HAVING COUNT(*) > 1) INTO has_bad_ids;
				IF has_bad_ids THEN
					RAISE EXCEPTION 'cannot repair device_link_tokens.id because duplicate ids exist';
				END IF;

				ALTER TABLE device_link_tokens ALTER COLUMN id SET NOT NULL;

				IF NOT EXISTS (
					SELECT 1
					FROM pg_constraint c
					JOIN pg_class t ON t.oid = c.conrelid
					JOIN pg_namespace n ON n.oid = t.relnamespace
					JOIN unnest(c.conkey) WITH ORDINALITY AS keys(attnum, ord) ON TRUE
					JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = keys.attnum
					WHERE n.nspname = current_schema()
					  AND t.relname = 'device_link_tokens'
					  AND c.contype IN ('p', 'u')
					GROUP BY c.oid
					HAVING array_agg(a.attname ORDER BY keys.ord) = ARRAY['id'::name]
				) THEN
					ALTER TABLE device_link_tokens
						ADD CONSTRAINT device_link_tokens_id_unique_repair UNIQUE (id);
				END IF;

				SELECT column_default
				INTO id_default
				FROM information_schema.columns
				WHERE table_schema = current_schema()
				  AND table_name = 'device_link_tokens'
				  AND column_name = 'id';

				IF id_default IS NULL THEN
					CREATE SEQUENCE IF NOT EXISTS device_link_tokens_id_seq;
					ALTER SEQUENCE device_link_tokens_id_seq OWNED BY device_link_tokens.id;
					ALTER TABLE device_link_tokens
						ALTER COLUMN id SET DEFAULT nextval('device_link_tokens_id_seq'::regclass);
					SELECT COALESCE(MAX(id), 0) FROM device_link_tokens INTO max_id;
					PERFORM setval(sequence_regclass::regclass, GREATEST(max_id, 1), max_id > 0);
				END IF;
			END $$;
		`},
	},
	46: {
		version: 46,
		repairSQL: []string{`
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
		`},
	},
	47: {
		version: 47,
		repairSQL: []string{`
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
		`},
	},
}

// PrepareDatabaseForMigrations clears known-safe dirty migration states before
// running the standard migration flow.
func PrepareDatabaseForMigrations(databaseURL string) error {
	version, dirty, err := migrationVersion(databaseURL)
	if err != nil {
		return err
	}

	if !dirty {
		return nil
	}

	repaired, err := tryRepairDirtyMigration(databaseURL, version)
	if err != nil {
		return err
	}
	if !repaired {
		return fmt.Errorf("database is dirty at version %d and no automatic repair is available", version)
	}

	log.Printf("Recovered dirty migration state at version %d", version)
	return nil
}

func migrationVersion(databaseURL string) (uint, bool, error) {
	m, err := newMigrator(databaseURL)
	if err != nil {
		return 0, false, err
	}
	defer m.Close()

	version, dirty, err := m.Version()
	if err != nil {
		if errors.Is(err, migrate.ErrNilVersion) {
			return 0, false, nil
		}
		return 0, false, fmt.Errorf("failed to read migration version: %w", err)
	}

	return version, dirty, nil
}

func tryRepairDirtyMigration(databaseURL string, version uint) (bool, error) {
	spec, ok := repairableAdditiveColumnMigrations[version]
	if !ok {
		return false, nil
	}

	return repairAdditiveColumnMigration(databaseURL, spec)
}

func repairAdditiveColumnMigration(databaseURL string, spec additiveColumnMigration) (bool, error) {
	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		return false, fmt.Errorf("failed to open database for repair: %w", err)
	}
	defer pool.Close()

	for _, stmt := range spec.repairSQL {
		if _, err := pool.Exec(context.Background(), stmt); err != nil {
			return false, fmt.Errorf("failed to apply repair SQL for migration %d: %w", spec.version, err)
		}
	}

	for _, check := range spec.checks {
		existingColumns, err := countExistingColumns(context.Background(), pool, check.table, check.columns)
		if err != nil {
			return false, fmt.Errorf("failed to inspect schema for migration %d: %w", spec.version, err)
		}

		if existingColumns != len(check.columns) {
			return false, fmt.Errorf(
				"migration %d is dirty but only %d/%d expected columns exist on %s (%s)",
				spec.version,
				existingColumns,
				len(check.columns),
				check.table,
				strings.Join(check.columns, ", "),
			)
		}
	}

	for _, index := range spec.indexes {
		exists, err := indexExists(context.Background(), pool, index.name)
		if err != nil {
			return false, fmt.Errorf("failed to inspect indexes for migration %d: %w", spec.version, err)
		}
		if exists {
			continue
		}

		if _, err := pool.Exec(context.Background(), index.createSQL); err != nil {
			return false, fmt.Errorf("failed to create missing index %s for migration %d: %w", index.name, spec.version, err)
		}
	}

	if err := ForceVersion(databaseURL, int(spec.version)); err != nil {
		return false, fmt.Errorf("failed to clear dirty state for migration %d: %w", spec.version, err)
	}

	return true, nil
}

func countExistingColumns(ctx context.Context, pool *pgxpool.Pool, table string, columns []string) (int, error) {
	var count int
	err := pool.QueryRow(
		ctx,
		`SELECT COUNT(*)
		FROM information_schema.columns
		WHERE table_schema = current_schema()
		  AND table_name = $1
		  AND column_name = ANY($2)`,
		table,
		columns,
	).Scan(&count)
	if err != nil {
		return 0, err
	}

	return count, nil
}

func indexExists(ctx context.Context, pool *pgxpool.Pool, indexName string) (bool, error) {
	var exists bool
	err := pool.QueryRow(
		ctx,
		`SELECT EXISTS (
			SELECT 1
			FROM pg_indexes
			WHERE schemaname = current_schema()
			  AND indexname = $1
		)`,
		indexName,
	).Scan(&exists)
	if err != nil {
		return false, err
	}

	return exists, nil
}
