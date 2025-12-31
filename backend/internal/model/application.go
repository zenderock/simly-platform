package model

import "time"

type Application struct {
	ID             int       `json:"id"`
	OrganizationID int       `json:"organization_id"`
	Name           string    `json:"name"`
	IsSandbox      bool      `json:"is_sandbox"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type CreateApplicationRequest struct {
	Name      string `json:"name"`
	IsSandbox bool   `json:"is_sandbox"`
}
