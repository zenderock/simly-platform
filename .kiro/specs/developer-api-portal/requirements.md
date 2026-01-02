# Requirements Document

## Introduction

Ce document définit les exigences pour le portail développeur de Simly, permettant aux développeurs externes d'intégrer l'envoi de SMS via API. Le système existant dispose déjà d'une infrastructure de base (API keys, webhooks), mais nécessite une API publique dédiée séparée des endpoints internes du SaaS, ainsi qu'une expérience développeur complète incluant documentation, exemples de code, logs de requêtes, et outils de test.

## Glossary

- **Simly_Public_API**: L'interface de programmation REST publique sous le préfixe `/v1/` permettant l'envoi de SMS via les appareils Android connectés, séparée des endpoints internes du SaaS
- **SaaS_Internal_API**: Les endpoints sous `/api/` utilisés exclusivement par le frontend du dashboard Simly
- **API_Key**: Token d'authentification au format `sk_live_*` ou `sk_test_*` permettant d'identifier et autoriser les requêtes sur la Simly_Public_API
- **Webhook**: Point de terminaison HTTP configuré pour recevoir des notifications d'événements (statut SMS, SMS entrants)
- **Developer_Portal**: Interface web dans le dashboard permettant aux développeurs de gérer leurs intégrations API
- **Request_Log**: Enregistrement d'une requête API incluant timestamp, endpoint, statut et temps de réponse
- **Code_Snippet**: Exemple de code prêt à l'emploi dans un langage de programmation spécifique
- **Sandbox_Mode**: Mode de test utilisant des API_Key au format `sk_test_*` simulant l'envoi de SMS sans utiliser de vrais appareils

## Requirements

### Requirement 1

**User Story:** As a developer, I want to view API documentation directly in the dashboard, so that I can understand how to integrate SMS sending into my application.

#### Acceptance Criteria

1. WHEN a developer navigates to the API documentation page THEN the Developer_Portal SHALL display all available endpoints with their HTTP methods, paths, and descriptions
2. WHEN a developer views an endpoint documentation THEN the Developer_Portal SHALL show request parameters, headers, and example request/response bodies in JSON format
3. WHEN a developer selects a programming language THEN the Developer_Portal SHALL display Code_Snippets for that endpoint in the selected language (cURL, JavaScript, Python, PHP, Go)
4. WHEN the API specification changes THEN the Developer_Portal SHALL reflect the updated documentation within the same deployment

### Requirement 2

**User Story:** As a developer, I want to test API calls directly from the dashboard, so that I can verify my integration without writing code first.

#### Acceptance Criteria

1. WHEN a developer opens the API playground THEN the Developer_Portal SHALL provide an interactive form to construct API requests with their active API_Key pre-filled
2. WHEN a developer submits a test request THEN the Developer_Portal SHALL execute the request and display the response status, headers, and body within 5 seconds
3. WHEN a developer tests in Sandbox_Mode THEN the Simly_API SHALL simulate message delivery without sending real SMS
4. WHEN a test request fails THEN the Developer_Portal SHALL display the error code and a human-readable explanation

### Requirement 3

**User Story:** As a developer, I want to view logs of my API requests, so that I can debug integration issues and monitor usage.

#### Acceptance Criteria

1. WHEN a developer accesses the request logs page THEN the Developer_Portal SHALL display the 100 most recent API requests with timestamp, endpoint, status code, and response time
2. WHEN a developer clicks on a Request_Log entry THEN the Developer_Portal SHALL show the full request and response details including headers and body
3. WHEN a developer filters logs by status code or endpoint THEN the Developer_Portal SHALL display only matching Request_Log entries
4. WHEN an API request is made with an API_Key THEN the Simly_API SHALL create a Request_Log entry within 1 second of request completion

### Requirement 4

**User Story:** As a developer, I want to manage multiple API keys with different permissions, so that I can separate access for different environments or services.

#### Acceptance Criteria

1. WHEN a developer creates an API_Key THEN the Developer_Portal SHALL allow setting a descriptive name and selecting the target application (sandbox or production)
2. WHEN a developer views their API keys THEN the Developer_Portal SHALL display the key prefix, name, creation date, and last used timestamp
3. WHEN a developer revokes an API_Key THEN the Simly_API SHALL reject all subsequent requests using that key within 1 second
4. WHEN an API_Key is used THEN the Simly_API SHALL update the last_used_at timestamp

### Requirement 5

**User Story:** As a developer, I want to configure webhooks to receive real-time notifications, so that I can react to message status changes and inbound SMS.

#### Acceptance Criteria

1. WHEN a developer creates a Webhook THEN the Developer_Portal SHALL require a valid HTTPS URL and allow selecting event types (message.sent, message.delivered, message.failed, message.received)
2. WHEN a developer views their webhooks THEN the Developer_Portal SHALL display the URL, event types, and a masked signing secret
3. WHEN a developer tests a Webhook THEN the Developer_Portal SHALL send a test payload and display the response status
4. WHEN a message status changes THEN the Simly_API SHALL dispatch a signed Webhook event to all matching endpoints within 5 seconds

### Requirement 6

**User Story:** As a developer, I want to copy ready-to-use code examples, so that I can quickly integrate SMS sending into my application.

#### Acceptance Criteria

1. WHEN a developer views the quick start guide THEN the Developer_Portal SHALL display step-by-step integration instructions with Code_Snippets
2. WHEN a developer clicks a copy button on a Code_Snippet THEN the Developer_Portal SHALL copy the code to clipboard and show a confirmation
3. WHEN a developer selects their API_Key in the code examples THEN the Developer_Portal SHALL insert the actual key prefix (masked) into the Code_Snippets
4. WHEN Code_Snippets are displayed THEN the Developer_Portal SHALL include error handling and best practices comments



### Requirement 7

**User Story:** As a developer, I want to use a dedicated public API with a separate URL structure, so that my integration is isolated from the internal SaaS endpoints.

#### Acceptance Criteria

1. WHEN a developer makes a request to the Simly_Public_API THEN the request path SHALL start with `/v1/` prefix (e.g., `/v1/messages`, `/v1/messages/{id}`)
2. WHEN a developer authenticates to the Simly_Public_API THEN the system SHALL accept only API_Key authentication via the `Authorization: Bearer sk_*` header
3. WHEN a developer sends an SMS via the Simly_Public_API THEN the endpoint SHALL be `POST /v1/messages` with a JSON body containing `to` and `body` fields
4. WHEN a developer queries message status THEN the endpoint SHALL be `GET /v1/messages/{id}` returning the message details and current status
5. WHEN a developer uses a `sk_test_*` API_Key THEN the Simly_Public_API SHALL operate in Sandbox_Mode without sending real SMS
6. WHEN a developer uses a `sk_live_*` API_Key THEN the Simly_Public_API SHALL route the message to a connected device for real delivery

### Requirement 8

**User Story:** As a developer, I want clear error responses from the API, so that I can handle failures appropriately in my application.

#### Acceptance Criteria

1. WHEN an API request fails validation THEN the Simly_Public_API SHALL return HTTP 400 with a JSON body containing `error.code`, `error.message`, and `error.param` fields
2. WHEN an API_Key is invalid or revoked THEN the Simly_Public_API SHALL return HTTP 401 with error code `invalid_api_key`
3. WHEN rate limits are exceeded THEN the Simly_Public_API SHALL return HTTP 429 with error code `rate_limit_exceeded` and a `Retry-After` header
4. WHEN a requested resource is not found THEN the Simly_Public_API SHALL return HTTP 404 with error code `resource_not_found`
5. WHEN an internal error occurs THEN the Simly_Public_API SHALL return HTTP 500 with error code `internal_error` and log the details for debugging
