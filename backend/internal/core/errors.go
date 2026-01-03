package core

import "errors"

var (
	// ErrLimitExceeded is returned when a plan limit is reached
	ErrLimitExceeded = errors.New("limit exceeded")

	// ErrUnauthorized is returned when a resource access is denied
	ErrUnauthorized = errors.New("unauthorized")

	// ErrNotFound is returned when a resource is not found
	ErrNotFound = errors.New("resource not found")
)
