package server

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/zenderock/simly-backend/internal/api"
	"github.com/zenderock/simly-backend/internal/config"
	"github.com/zenderock/simly-backend/internal/core"
	"github.com/zenderock/simly-backend/internal/store"
)

type Server struct {
	Config *config.Config
	DB     *store.Store
	Router chi.Router
}

func New(cfg *config.Config) (*Server, error) {
	// Database & Migrations
	db, err := store.New(cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("database connection failed: %w", err)
	}

	if err := store.RunMigrations(cfg.DatabaseURL); err != nil {
		log.Printf("Migration warning: %v", err)
	}

	s := &Server{
		Config: cfg,
		DB:     db,
		Router: chi.NewRouter(),
	}

	s.setupRoutes()
	return s, nil
}

func (s *Server) Close() {
	s.DB.Close()
}

func (s *Server) setupRoutes() {
	jwtSecret := []byte(s.Config.JWTSecret)

	// Dependency Injection
	var notificationProvider core.NotificationProvider = &core.LogNotificationProvider{}
	if s.Config.FirebaseServiceAccount != "" {
		saJSON := []byte(s.Config.FirebaseServiceAccount)
		// Check if it's a file path (doesn't start with '{')
		if len(saJSON) > 0 && saJSON[0] != '{' {
			content, err := os.ReadFile(s.Config.FirebaseServiceAccount)
			if err == nil {
				saJSON = content
			} else {
				log.Printf("Warning: Failed to read Firebase service account file at %s: %v", s.Config.FirebaseServiceAccount, err)
			}
		}

		fcm, err := core.NewFCMProvider(context.Background(), saJSON)
		if err == nil {
			notificationProvider = fcm
			log.Println("FCM Provider initialized")
		} else {
			log.Printf("Failed to initialize FCM Provider: %v", err)
		}
	}
	emailProvider := core.NewResendEmailProvider(s.Config.ResendAPIKey, s.Config.ResendFromEmail)
	alertService := core.NewAlertService(s.DB, emailProvider)

	orgService := core.NewOrganizationService(s.DB)
	appService := core.NewApplicationService(s.DB)
	apiKeyService := core.NewAPIKeyService(s.DB)
	webhookService := core.NewWebhookService(s.DB)
	authUserService := core.NewUserService(s.DB, orgService, appService, string(jwtSecret))
	userProfileService := core.NewUserProfileService(s.DB)
	deviceService := core.NewDeviceService(s.DB, alertService, s.Config.JWTSecret)
	rateLimitService := core.NewRateLimitService(s.DB)
	auditService := core.NewAuditService(s.DB)
	messageService := core.NewMessageService(s.DB, webhookService, notificationProvider, rateLimitService, appService, s.Config.SandboxSuccessNumber, s.Config.SandboxFailureNumber, alertService)

	// Start Workers
	scheduler := core.NewSchedulerService(s.DB, messageService)
	go scheduler.Start(context.Background())

	monitoringService := core.NewMonitoringService(s.DB, alertService, messageService)
	go monitoringService.Start(context.Background())

	// Handlers
	authHandler := api.NewAuthHandler(authUserService)
	userHandler := api.NewUserHandler(userProfileService, auditService)
	appHandler := api.NewApplicationHandler(appService, orgService, auditService)
	apiKeyHandler := api.NewAPIKeyHandler(apiKeyService, appService, orgService, auditService)
	deviceHandler := api.NewDeviceHandler(deviceService, orgService, auditService)
	messageHandler := api.NewMessageHandler(messageService, orgService, deviceService)
	webhookHandler := api.NewWebhookHandler(webhookService, orgService, auditService)
	orgHandler := api.NewOrganizationHandler(orgService, auditService, s.Config.StripePricePro, s.Config.StripePriceAgency)
	alertHandler := api.NewAlertHandler(alertService, orgService)

	// Billing
	billingService := core.NewBillingService(s.DB, s.Config.StripeSecretKey, s.Config.StripeWebhookSecret, "http://localhost:3000", s.Config.StripePricePro, s.Config.StripePriceAgency) // TODO: get frontend URL from config
	billingHandler := api.NewBillingHandler(billingService, orgService)

	// Routing
	r := s.Router

	// ... Middlewares ...

	// Global Middlewares
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.StripSlashes)
	r.Use(middleware.Timeout(60 * time.Second))

	// CORS
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"}, // Allow all origins for dev
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Organization-ID"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// Public Routes
	r.Post("/api/webhooks/stripe", billingHandler.HandleStripeWebhook)

	// Health Check
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Simly Gateway API v1.0 - Operating Normally"))
	})

	// Public Routes
	r.Route("/api/auth", func(r chi.Router) {
		r.Post("/register", authHandler.Register)
		r.Post("/login", authHandler.Login)
	})

	// Public device linking endpoint (for mobile app)
	r.Post("/api/devices/link", deviceHandler.LinkDevice)

	// Protected Routes (SaaS core)
	r.Group(func(r chi.Router) {
		r.Use(api.AuthMiddleware(jwtSecret, apiKeyService))

		// Application Management
		r.Route("/api/applications", func(r chi.Router) {
			r.Get("/", appHandler.ListApplications)
			r.Post("/", appHandler.CreateApplication)
			r.Delete("/{appID}", appHandler.DeleteApplication)
		})

		// API Keys
		r.Route("/api/api-keys", func(r chi.Router) {
			r.Get("/", apiKeyHandler.ListAPIKeys)
			r.Post("/", apiKeyHandler.CreateAPIKey)
			r.Delete("/{keyID}", apiKeyHandler.RevokeAPIKey)
		})

		// Device Management
		r.Route("/api/devices", func(r chi.Router) {
			r.Get("/", deviceHandler.ListDevices)
			r.Post("/", deviceHandler.RegisterDevice)
			r.Post("/link-token", deviceHandler.GenerateLinkToken)
			r.Get("/link-token/{token}", deviceHandler.GetLinkTokenStatus)
			r.Delete("/{deviceID}", deviceHandler.DeleteDevice)
			r.Post("/{deviceID}/heartbeat", deviceHandler.Heartbeat)
		})

		// Messaging
		r.Route("/api/messages", func(r chi.Router) {
			r.Get("/", messageHandler.ListMessages)
			r.Post("/send", messageHandler.SendSMS)
			r.Post("/inbound", messageHandler.InternalReceiveSMS)
			r.Post("/{id}/status", messageHandler.UpdateStatus)
		})

		// Webhooks
		r.Route("/api/webhooks", func(r chi.Router) {
			r.Get("/", webhookHandler.ListWebhooks)
			r.Post("/", webhookHandler.RegisterWebhook)
			r.Delete("/{webhookID}", webhookHandler.DeleteWebhook)
		})

		// Dashboard
		dashboardService := core.NewDashboardService(s.DB)
		dashboardHandler := api.NewDashboardHandler(dashboardService, orgService)

		r.Route("/api/dashboard", func(r chi.Router) {
			r.Get("/stats", dashboardHandler.GetStats)
			r.Get("/traffic", dashboardHandler.GetTrafficStats)
		})

		// Organization Management
		r.Route("/api/organizations", func(r chi.Router) {
			r.Get("/", orgHandler.ListOrganizations)
			r.Get("/current", orgHandler.GetOrganization)
			r.Put("/current", orgHandler.UpdateOrganization)
			r.Put("/current/plan", orgHandler.UpdatePlan)
			r.Get("/current/stats", orgHandler.GetOrganizationStats)
			r.Get("/plans", orgHandler.ListPlans)
			r.Post("/", orgHandler.CreateOrganization)
			r.Post("/members", orgHandler.AddMember)
			r.Delete("/members/{userID}", orgHandler.RemoveMember)
		})

		// User Profile
		r.Route("/api/user", func(r chi.Router) {
			r.Get("/profile", userHandler.GetProfile)
			r.Put("/profile", userHandler.UpdateProfile)
			r.Put("/password", userHandler.ChangePassword)
		})

		// Alerts
		r.Route("/api/alerts", func(r chi.Router) {
			r.Get("/", alertHandler.ListAlerts)
			r.Post("/{alertID}/read", alertHandler.MarkAsRead)
			r.Post("/test", alertHandler.CreateTestAlert) // Route de test
		})

		// Contacts & Lists/Groups
		contactService := core.NewContactService(s.DB)
		contactHandler := api.NewContactHandler(contactService, orgService)

		r.Route("/api/contacts", func(r chi.Router) {
			r.Get("/", contactHandler.ListContacts)
			r.Post("/", contactHandler.CreateContact)
			r.Put("/{id}", contactHandler.UpdateContact)
			r.Delete("/{id}", contactHandler.DeleteContact)
			r.Post("/import", contactHandler.ImportContacts)
		})

		r.Route("/api/contact-lists", func(r chi.Router) {
			r.Get("/", contactHandler.ListLists)
			r.Post("/", contactHandler.CreateList)
			r.Get("/{id}", contactHandler.GetList)
			r.Delete("/{id}", contactHandler.DeleteList)
			r.Post("/{id}/members", contactHandler.ManageListMembers)
			r.Delete("/{id}/members/{memberID}", contactHandler.RemoveMember)
		})

		// Campaigns
		campaignService := core.NewCampaignService(s.DB, messageService)
		campaignHandler := api.NewCampaignHandler(campaignService, orgService)

		r.Route("/api/campaigns", func(r chi.Router) {
			r.Get("/", campaignHandler.ListCampaigns)
			r.Post("/", campaignHandler.CreateCampaign)
			r.Get("/{id}", campaignHandler.GetCampaign)
			r.Delete("/{id}", campaignHandler.DeleteCampaign)
			r.Post("/{id}/launch", campaignHandler.LaunchCampaign)
			r.Get("/{id}/analytics", campaignHandler.GetCampaignAnalytics)
		})

		// Billing
		r.Route("/api/billing", func(r chi.Router) {
			billingHandler.RegisterRoutes(r)
		})
	})
}
