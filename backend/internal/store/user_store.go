package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/zenderock/simly-backend/internal/model"
)

func (s *Store) CreateUser(ctx context.Context, user *model.User) error {
	query := `
		INSERT INTO users (email, password_hash, name, avatar_url, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`
	err := s.db.QueryRow(ctx, query, user.Email, user.PasswordHash, user.Name, user.AvatarURL).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}
	return nil
}

func (s *Store) GetUserByEmail(ctx context.Context, email string) (*model.User, error) {
	query := `
		SELECT id, email, password_hash, name, avatar_url, created_at, updated_at
		FROM users
		WHERE email = $1
	`
	user := &model.User{}
	err := s.db.QueryRow(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Name,
		&user.AvatarURL,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return user, nil
}
func (s *Store) GetUsersByOrganizationID(ctx context.Context, orgID int) ([]model.User, error) {
	query := `
		SELECT u.id, u.email, u.name, u.avatar_url, u.created_at, u.updated_at
		FROM users u
		JOIN organization_members om ON u.id = om.user_id
		WHERE om.organization_id = $1
	`
	rows, err := s.db.Query(ctx, query, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to query organization users: %w", err)
	}
	defer rows.Close()

	var users []model.User
	for rows.Next() {
		var u model.User
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, u)
	}
	return users, nil
}
