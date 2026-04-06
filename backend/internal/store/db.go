package store

import (
	"context"
	"fmt"
	"log"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zenderock/simly-backend/migrations"
)

type DBTX interface {
	Exec(context.Context, string, ...interface{}) (pgconn.CommandTag, error)
	Query(context.Context, string, ...interface{}) (pgx.Rows, error)
	QueryRow(context.Context, string, ...interface{}) pgx.Row
}

type Store struct {
	db DBTX
}

func New(databaseURL string) (*Store, error) {
	if databaseURL == "" {
		return nil, fmt.Errorf("database URL is required")
	}

	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("unable to parse database URL: %w", err)
	}

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("unable to connect to database: %w", err)
	}

	log.Println("Connected to database successfully")
	return &Store{db: pool}, nil
}

func (s *Store) Close() {
	if pool, ok := s.db.(*pgxpool.Pool); ok {
		pool.Close()
	}
}

// ExecTx executes a function within a database transaction
func (s *Store) ExecTx(ctx context.Context, fn func(*Store) error) error {
	pool, ok := s.db.(*pgxpool.Pool)
	if !ok {
		return fmt.Errorf("store is already in a transaction")
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if err := fn(&Store{db: tx}); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func RunMigrations(databaseURL string) error {
	m, err := newMigrator(databaseURL)
	if err != nil {
		return err
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Println("Database migration executed successfully")
	return nil
}

func ForceVersion(databaseURL string, version int) error {
	m, err := newMigrator(databaseURL)
	if err != nil {
		return err
	}
	defer m.Close()

	if err := m.Force(version); err != nil {
		return fmt.Errorf("failed to force version: %w", err)
	}

	return nil
}

func newMigrator(databaseURL string) (*migrate.Migrate, error) {
	driver, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return nil, fmt.Errorf("failed to create iofs source: %w", err)
	}

	m, err := migrate.NewWithSourceInstance(
		"iofs",
		driver,
		databaseURL,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create migration instance: %w", err)
	}

	return m, nil
}
