package api

import (
	"context"
	"net/http"

	"github.com/golang-jwt/jwt/v5"
	"github.com/zenderock/simly-backend/internal/core"
)

type contextKey string

const userIDKey contextKey = "user_id"
const appIDKey contextKey = "app_id"
const orgIDKey contextKey = "org_id"

func AuthMiddleware(jwtSecret []byte, apiKeyService *core.APIKeyService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tokenString := r.Header.Get("Authorization")
			if len(tokenString) > 7 && tokenString[:7] == "Bearer " {
				tokenString = tokenString[7:]
			} else {
				http.Error(w, "Unauthorized: Missing or invalid token", http.StatusUnauthorized)
				return
			}

			// 1. Check for API Key (starts with sk_live_)
			if len(tokenString) > 8 && tokenString[:8] == "sk_live_" {
				apiKey, err := apiKeyService.VerifyAPIKey(r.Context(), tokenString)
				if err != nil {
					http.Error(w, "Unauthorized: Invalid API Key", http.StatusUnauthorized)
					return
				}
				ctx := context.WithValue(r.Context(), orgIDKey, apiKey.OrganizationID)
				ctx = context.WithValue(ctx, appIDKey, apiKey.ApplicationID)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// 2. Fallback to JWT
			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				return jwtSecret, nil
			})

			if err != nil || !token.Valid {
				http.Error(w, "Unauthorized: Invalid token", http.StatusUnauthorized)
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				http.Error(w, "Unauthorized: Invalid claims", http.StatusUnauthorized)
				return
			}

			userID, ok := claims["sub"].(float64)
			if !ok {
				http.Error(w, "Unauthorized: Invalid user ID", http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), userIDKey, int(userID))
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUserID(ctx context.Context) int {
	id, _ := ctx.Value(userIDKey).(int)
	return id
}
