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
	user.IsPlatformAdmin = model.IsPlatformAdminEmail(user.Email)
	return nil
}

func (s *Store) GetUserByEmail(ctx context.Context, email string) (*model.User, error) {
	query := `
		SELECT id, email, password_hash, name, avatar_url, is_platform_admin, created_at, updated_at
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
		&user.IsPlatformAdmin,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	user.IsPlatformAdmin = user.IsPlatformAdmin || model.IsPlatformAdminEmail(user.Email)
	return user, nil
}
func (s *Store) GetUsersByOrganizationID(ctx context.Context, orgID int) ([]model.User, error) {
	query := `
		SELECT u.id, u.email, u.name, u.avatar_url, u.is_platform_admin, u.created_at, u.updated_at
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
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.AvatarURL, &u.IsPlatformAdmin, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		u.IsPlatformAdmin = u.IsPlatformAdmin || model.IsPlatformAdminEmail(u.Email)
		users = append(users, u)
	}
	return users, nil
}
func (s *Store) GetUserByID(ctx context.Context, userID int) (*model.User, error) {
	query := `
		SELECT id, email, password_hash, name, avatar_url, is_platform_admin, created_at, updated_at
		FROM users
		WHERE id = $1
	`
	user := &model.User{}
	err := s.db.QueryRow(ctx, query, userID).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Name,
		&user.AvatarURL,
		&user.IsPlatformAdmin,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	user.IsPlatformAdmin = user.IsPlatformAdmin || model.IsPlatformAdminEmail(user.Email)
	return user, nil
}

func (s *Store) IsPlatformAdmin(ctx context.Context, userID int) (bool, error) {
	var isPlatformAdmin bool
	var email string
	err := s.db.QueryRow(ctx, `SELECT email, is_platform_admin FROM users WHERE id = $1`, userID).Scan(&email, &isPlatformAdmin)
	if err != nil {
		return false, fmt.Errorf("failed to check platform admin: %w", err)
	}
	return isPlatformAdmin || model.IsPlatformAdminEmail(email), nil
}

func (s *Store) UpdateUser(ctx context.Context, userID int, name, email, avatarURL string) error {
	query := `
		UPDATE users 
		SET name = $1, email = $2, avatar_url = $3, updated_at = NOW()
		WHERE id = $4
	`
	result, err := s.db.Exec(ctx, query, name, email, avatarURL, userID)
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("user not found")
	}
	return nil
}

func (s *Store) UpdateUserPassword(ctx context.Context, userID int, passwordHash string) error {
	query := `
		UPDATE users 
		SET password_hash = $1, updated_at = NOW()
		WHERE id = $2
	`
	result, err := s.db.Exec(ctx, query, passwordHash, userID)
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("user not found")
	}
	return nil
}

func (s *Store) SetUserResetToken(ctx context.Context, userID int, token string, expiresAt interface{}) error {
	query := `
		UPDATE users 
		SET password_reset_token = $1, password_reset_expires_at = $2, updated_at = NOW()
		WHERE id = $3
	`
	_, err := s.db.Exec(ctx, query, token, expiresAt, userID)
	return err
}

func (s *Store) GetUserByResetToken(ctx context.Context, token string) (*model.User, error) {
	query := `
		SELECT id, email, password_hash, name, avatar_url, password_reset_token, password_reset_expires_at, is_platform_admin, created_at, updated_at
		FROM users
		WHERE password_reset_token = $1
	`
	user := &model.User{}
	err := s.db.QueryRow(ctx, query, token).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Name,
		&user.AvatarURL,
		&user.PasswordResetToken,
		&user.PasswordResetExpiresAt,
		&user.IsPlatformAdmin,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("invalid or expired token")
		}
		return nil, err
	}
	user.IsPlatformAdmin = user.IsPlatformAdmin || model.IsPlatformAdminEmail(user.Email)
	return user, nil
}

func (s *Store) ClearUserResetToken(ctx context.Context, userID int) error {
	query := `
		UPDATE users 
		SET password_reset_token = NULL, password_reset_expires_at = NULL, updated_at = NOW()
		WHERE id = $1
	`
	_, err := s.db.Exec(ctx, query, userID)
	return err
}
