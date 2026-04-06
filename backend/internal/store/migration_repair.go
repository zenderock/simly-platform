package store

import (
	"context"
	"errors"
	"fmt"
	"log"

	"github.com/golang-migrate/migrate/v4"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	alertConfigMigrationVersion = uint(25)
)

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
	switch version {
	case alertConfigMigrationVersion:
		return repairAlertConfigMigration(databaseURL)
	default:
		return false, nil
	}
}

func repairAlertConfigMigration(databaseURL string) (bool, error) {
	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		return false, fmt.Errorf("failed to open database for repair: %w", err)
	}
	defer pool.Close()

	var existingColumns int
	err = pool.QueryRow(
		context.Background(),
		`SELECT COUNT(*)
		FROM information_schema.columns
		WHERE table_schema = current_schema()
		  AND table_name = 'applications'
		  AND column_name IN ('slack_webhook_url', 'ntfy_topic', 'alert_settings')`,
	).Scan(&existingColumns)
	if err != nil {
		return false, fmt.Errorf("failed to inspect schema for migration 25: %w", err)
	}

	if existingColumns != 3 {
		return false, fmt.Errorf(
			"migration 25 is dirty but only %d/3 expected columns exist on applications",
			existingColumns,
		)
	}

	if err := ForceVersion(databaseURL, int(alertConfigMigrationVersion)); err != nil {
		return false, fmt.Errorf("failed to clear dirty state for migration 25: %w", err)
	}

	return true, nil
}
