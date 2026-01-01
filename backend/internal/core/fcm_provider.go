package core

import (
	"context"
	"fmt"
	"log"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"google.golang.org/api/option"
)

type FCMProvider struct {
	client *messaging.Client
}

func NewFCMProvider(ctx context.Context, serviceAccountJSON []byte) (*FCMProvider, error) {
	opt := option.WithCredentialsJSON(serviceAccountJSON)
	app, err := firebase.NewApp(ctx, nil, opt)
	if err != nil {
		return nil, fmt.Errorf("error initializing firebase app: %v", err)
	}

	client, err := app.Messaging(ctx)
	if err != nil {
		return nil, fmt.Errorf("error getting messaging client: %v", err)
	}

	return &FCMProvider{client: client}, nil
}

func (p *FCMProvider) SendPush(ctx context.Context, token, title, body string, data map[string]string) error {
	if token == "" {
		return fmt.Errorf("fcm token is empty")
	}

	message := &messaging.Message{
		Token: token,
		Data:  data,
		Notification: &messaging.Notification{
			Title: title,
			Body:  body,
		},
		Android: &messaging.AndroidConfig{
			Priority: "high",
		},
	}

	response, err := p.client.Send(ctx, message)
	if err != nil {
		return fmt.Errorf("error sending fcm message: %v", err)
	}

	log.Printf("Successfully sent FCM message: %s\n", response)
	return nil
}
