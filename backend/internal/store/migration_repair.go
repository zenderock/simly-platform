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
	version uint
	checks  []columnCheck
	indexes []indexCheck
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
