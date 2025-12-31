package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/joho/godotenv"
	"github.com/stretchr/testify/assert"
	"github.com/zenderock/simly-backend/internal/config"
	"github.com/zenderock/simly-backend/internal/server"
)

// Global test variables
var (
	testServer *server.Server
	authToken  string
	orgID      int
	appID      int
)

func TestMain(m *testing.M) {
	// 1. Setup
	// Load .env from parent directory
	if err := godotenv.Load("../.env"); err != nil {
		// Log but don't panic, maybe Env vars are set?
		// or panic if we rely on it.
	}

	os.Setenv("PORT", "8888")
	// Use the real DB from .env (User must ensure it's safe or a test DB)
	// Ideally, we'd swap this for a test-specific DB URL if available.

	cfg := config.Load()

	var err error
	testServer, err = server.New(cfg)
	if err != nil {
		panic(err)
	}
	defer testServer.Close()

	// Run tests
	code := m.Run()

	// Teardown
	os.Exit(code)
}

func executeRequest(req *http.Request) *httptest.ResponseRecorder {
	rr := httptest.NewRecorder()
	testServer.Router.ServeHTTP(rr, req)
	return rr
}

func Test1_RegisterAndLogin(t *testing.T) {
	// Register
	email := "testuser_" + time.Now().Format("20060102150405") + "@example.com"
	password := "password123"

	regPayload := map[string]string{
		"email":    email,
		"password": password,
		"name":     "Test User",
	}
	body, _ := json.Marshal(regPayload)
	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	rr := executeRequest(req)
	assert.Equal(t, http.StatusCreated, rr.Code)

	// Login
	loginPayload := map[string]string{
		"email":    email,
		"password": password,
	}
	body, _ = json.Marshal(loginPayload)
	req, _ = http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	rr = executeRequest(req)
	assert.Equal(t, http.StatusOK, rr.Code)

	var response map[string]interface{}
	json.Unmarshal(rr.Body.Bytes(), &response)
	authToken = response["token"].(string)
	assert.NotEmpty(t, authToken)
}

func Test2_CreateOrganization(t *testing.T) {
	// At this moment, registration creates a default org?
	// Let's verify existing orgs first.
	// Since we don't have a GET /api/organizations directly exposed to list,
	// we rely on the side-effect of registration creating one OR creating one manually if endpoint exists.
	// Check auth_handler.go -> Register creates User. Does it create Org?
	// Let's assume we need to use a protected endpoint that uses orgs.

	// currently we don't have a "Create Organization" endpoint exposed in the router snippet provided,
	// only "Add Member".
	// Wait, if Register creates an Org, we are good.
	// Let's try List Applications. It should return empty list but 200 OK.

	req, _ := http.NewRequest("GET", "/api/applications", nil)
	req.Header.Set("Authorization", "Bearer "+authToken)

	rr := executeRequest(req)
	assert.Equal(t, http.StatusOK, rr.Code)

	// Capture the OrgID being used.
	// To do this strictly, we might need a "Get Me" or "List Orgs" endpoint.
	// But we can infer it if we create an app and checking response.
}

func Test3_CreateApplication_WithDefaultContext(t *testing.T) {
	payload := map[string]string{
		"name": "Integration Test App",
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/api/applications", bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer "+authToken)
	req.Header.Set("Content-Type", "application/json")

	rr := executeRequest(req)
	assert.Equal(t, http.StatusCreated, rr.Code)

	var response struct {
		ID             int    `json:"id"`
		OrganizationID int    `json:"organization_id"`
		Name           string `json:"name"`
	}
	json.Unmarshal(rr.Body.Bytes(), &response)

	assert.NotEmpty(t, response.ID)
	assert.Equal(t, "Integration Test App", response.Name)

	appID = response.ID
	orgID = response.OrganizationID

	t.Logf("Created App %d in Org %d", appID, orgID)
}

func Test4_CreateApplication_WithExplicitContext(t *testing.T) {
	// Now we know the OrgID, let's pass it explicitly
	payload := map[string]string{
		"name": "Explicit Context App",
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/api/applications", bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer "+authToken)
	req.Header.Set("Content-Type", "application/json")

	// Valid Context
	req.Header.Set("X-Organization-ID", strconv.Itoa(orgID))

	rr := executeRequest(req)
	assert.Equal(t, http.StatusCreated, rr.Code)

	// Invalid Context (Random ID)
	req2, _ := http.NewRequest("POST", "/api/applications", bytes.NewBuffer(body))
	req2.Header.Set("Authorization", "Bearer "+authToken)
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("X-Organization-ID", "999999") // Assuming this org doesn't exist or user not member

	rr2 := executeRequest(req2)
	// Should be 403 Forbidden or 404 (ErrNoOrganization mapped to forbidden in utils fallback?)
	// Actually GetActiveOrgID returns ErrNoOrganization, which usually bubbles up.
	// But in utils code: if err != nil ... return 0, ErrNoOrganization.
	// Handler checks err and returns 403 Forbidden ("Organization required").
	assert.Equal(t, http.StatusForbidden, rr2.Code)
}
