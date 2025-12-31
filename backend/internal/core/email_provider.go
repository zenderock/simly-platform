package core

import "context"

type EmailProvider interface {
	SendEmail(ctx context.Context, to string, subject string, htmlContent string) error
}
