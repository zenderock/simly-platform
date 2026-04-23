package tests

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"sync/atomic"
	"testing"
	"time"

	"github.com/zenderock/simly-backend/internal/config"
	"github.com/zenderock/simly-backend/internal/core"
	"github.com/zenderock/simly-backend/internal/server"
	"github.com/zenderock/simly-backend/internal/store"
)

var (
	publicAPITestServer     *server.Server
	publicAPITestStore      *store.Store
	publicAPITestAPIKeys    *core.APIKeyService
	publicAPITestStartupErr error
	publicAPITestCounter    uint64
	publicAPITestRuntime    *publicAPITestInfra
)

func TestMain(m *testing.M) {
	testDatabaseURL := os.Getenv("TEST_DATABASE_URL")
	testRedisURL := os.Getenv("TEST_REDIS_URL")

	if testDatabaseURL == "" || testRedisURL == "" {
		publicAPITestRuntime, publicAPITestStartupErr = startPublicAPITestInfra()
		if publicAPITestStartupErr == nil {
			testDatabaseURL = publicAPITestRuntime.DatabaseURL
			testRedisURL = publicAPITestRuntime.RedisURL
		}
	}

	if publicAPITestStartupErr == nil && testDatabaseURL != "" && testRedisURL != "" {
		os.Setenv("PORT", "8888")
		os.Setenv("DATABASE_URL", testDatabaseURL)
		os.Setenv("REDIS_URL", testRedisURL)
		os.Setenv("JWT_SECRET", "public-api-test-secret")
		os.Setenv("RESEND_API_KEY", "")
		os.Setenv("STRIPE_SECRET_KEY", "")
		os.Setenv("STRIPE_WEBHOOK_SECRET", "")
		os.Setenv("R2_ACCOUNT_ID", "")
		os.Setenv("OPENROUTER_API_KEY", "")
		os.Setenv("FIREBASE_SERVICE_ACCOUNT", "")

		cfg := config.Load()
		publicAPITestServer, publicAPITestStartupErr = server.NewWithOptions(cfg, server.Options{
			DisableBackgroundServices: true,
		})
		if publicAPITestStartupErr == nil {
			publicAPITestStore = publicAPITestServer.DB
			publicAPITestAPIKeys = core.NewAPIKeyService(publicAPITestStore)
		}
	}

	code := m.Run()

	if publicAPITestServer != nil {
		publicAPITestServer.Close()
	}
	if publicAPITestRuntime != nil {
		publicAPITestRuntime.Close()
	}

	os.Exit(code)
}

type publicAPITestEnv struct {
	Server  *server.Server
	Store   *store.Store
	APIKeys *core.APIKeyService
}

func requirePublicAPITestEnv(t *testing.T) *publicAPITestEnv {
	t.Helper()

	if publicAPITestStartupErr != nil {
		t.Fatalf("failed to start public API test server: %v", publicAPITestStartupErr)
	}

	return &publicAPITestEnv{
		Server:  publicAPITestServer,
		Store:   publicAPITestStore,
		APIKeys: publicAPITestAPIKeys,
	}
}

func (e *publicAPITestEnv) executeRequest(t *testing.T, method, path string, body []byte, headers map[string]string) *httptest.ResponseRecorder {
	t.Helper()

	req, err := http.NewRequest(method, path, bytes.NewReader(body))
	if err != nil {
		t.Fatalf("failed to create request: %v", err)
	}

	for key, value := range headers {
		req.Header.Set(key, value)
	}
	if body != nil && req.Header.Get("Content-Type") == "" {
		req.Header.Set("Content-Type", "application/json")
	}

	rr := httptest.NewRecorder()
	e.Server.Router.ServeHTTP(rr, req)
	return rr
}

func (e *publicAPITestEnv) executeJSONRequest(t *testing.T, method, path string, payload any, headers map[string]string) *httptest.ResponseRecorder {
	t.Helper()

	var body []byte
	if payload != nil {
		var err error
		body, err = json.Marshal(payload)
		if err != nil {
			t.Fatalf("failed to marshal payload: %v", err)
		}
	}

	return e.executeRequest(t, method, path, body, headers)
}

func decodeJSON[T any](t *testing.T, rr *httptest.ResponseRecorder) T {
	t.Helper()

	var value T
	if err := json.Unmarshal(rr.Body.Bytes(), &value); err != nil {
		t.Fatalf("failed to decode JSON response (%d): %v\nbody: %s", rr.Code, err, rr.Body.String())
	}
	return value
}

func nextPublicAPITestSuffix() string {
	id := atomic.AddUint64(&publicAPITestCounter, 1)
	return fmt.Sprintf("public-api-%d", id)
}

type publicAPITestInfra struct {
	PostgresContainer string
	RedisContainer    string
	DatabaseURL       string
	RedisURL          string
}

func startPublicAPITestInfra() (*publicAPITestInfra, error) {
	if _, err := exec.LookPath("docker"); err != nil {
		return nil, fmt.Errorf("docker is required to run public API integration tests: %w", err)
	}

	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	postgresName := "simly-test-postgres-" + suffix
	redisName := "simly-test-redis-" + suffix

	postgresPort, err := reserveTCPPort()
	if err != nil {
		return nil, fmt.Errorf("reserve postgres port: %w", err)
	}
	redisPort, err := reserveTCPPort()
	if err != nil {
		return nil, fmt.Errorf("reserve redis port: %w", err)
	}

	infra := &publicAPITestInfra{
		PostgresContainer: postgresName,
		RedisContainer:    redisName,
		DatabaseURL: fmt.Sprintf(
			"postgres://simly:simly@127.0.0.1:%d/simly_test?sslmode=disable",
			postgresPort,
		),
		RedisURL: fmt.Sprintf("redis://127.0.0.1:%d/0", redisPort),
	}

	if err := runDockerCommand(
		"run",
		"-d",
		"--name", postgresName,
		"-e", "POSTGRES_USER=simly",
		"-e", "POSTGRES_PASSWORD=simly",
		"-e", "POSTGRES_DB=simly_test",
		"-p", fmt.Sprintf("%d:5432", postgresPort),
		"postgres:16-alpine",
	); err != nil {
		infra.Close()
		return nil, fmt.Errorf("start postgres container: %w", err)
	}

	if err := runDockerCommand(
		"run",
		"-d",
		"--name", redisName,
		"-p", fmt.Sprintf("%d:6379", redisPort),
		"redis:7-alpine",
	); err != nil {
		infra.Close()
		return nil, fmt.Errorf("start redis container: %w", err)
	}

	if err := waitForPostgres(infra.DatabaseURL, 60*time.Second); err != nil {
		infra.Close()
		return nil, err
	}
	if err := waitForRedis(redisName, 30*time.Second); err != nil {
		infra.Close()
		return nil, err
	}

	return infra, nil
}

func (i *publicAPITestInfra) Close() {
	if i.PostgresContainer != "" {
		_ = runDockerCommand("rm", "-f", i.PostgresContainer)
	}
	if i.RedisContainer != "" {
		_ = runDockerCommand("rm", "-f", i.RedisContainer)
	}
}

func reserveTCPPort() (int, error) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}
	defer ln.Close()

	addr, ok := ln.Addr().(*net.TCPAddr)
	if !ok {
		return 0, fmt.Errorf("unexpected listener address type %T", ln.Addr())
	}
	return addr.Port, nil
}

func waitForPostgres(databaseURL string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	var lastErr error

	for time.Now().Before(deadline) {
		db, err := store.New(databaseURL)
		if err == nil {
			db.Close()
			return nil
		}
		lastErr = err
		time.Sleep(500 * time.Millisecond)
	}

	return fmt.Errorf("postgres did not become ready: %w", lastErr)
}

func waitForRedis(containerName string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	var lastErr error

	for time.Now().Before(deadline) {
		cmd := exec.Command("docker", "exec", containerName, "redis-cli", "ping")
		if output, err := cmd.CombinedOutput(); err == nil {
			if bytes.Contains(output, []byte("PONG")) {
				return nil
			}
			lastErr = fmt.Errorf("unexpected redis response: %s", bytes.TrimSpace(output))
		} else {
			lastErr = fmt.Errorf("%w: %s", err, bytes.TrimSpace(output))
		}
		time.Sleep(500 * time.Millisecond)
	}

	return fmt.Errorf("redis did not become ready: %w", lastErr)
}

func runDockerCommand(args ...string) error {
	cmd := exec.Command("docker", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%w: %s", err, bytes.TrimSpace(output))
	}
	return nil
}
