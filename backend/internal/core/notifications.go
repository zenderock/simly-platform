package core

import (
	"context"
	"log"
)

// NotificationProvider définit comment on communique avec les téléphones Android
// Permet de switcher de FCM à une autre solution (Socket.io) facilement.
type NotificationProvider interface {
	SendPush(ctx context.Context, token string, title string, body string, data map[string]string) error
}

// LogNotificationProvider est une implémentation de fallback professionnelle
type LogNotificationProvider struct{}

func (p *LogNotificationProvider) SendPush(ctx context.Context, token string, title string, body string, data map[string]string) error {
	log.Printf("[PUSH] Sending to %s: %s - %s (Data: %v)", token, title, body, data)
	return nil
}
