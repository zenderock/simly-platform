package core

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type AIService struct {
	apiKey string
}

func NewAIService(apiKey string) *AIService {
	return &AIService{apiKey: apiKey}
}

type OpenRouterRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OpenRouterResponse struct {
	Choices []struct {
		Message Message `json:"message"`
	} `json:"choices"`
}

// GeneratePrefixes asks AI to generate prefixes for a country/operator
func (s *AIService) GeneratePrefixes(ctx context.Context, prompt string) (string, error) {
	if s.apiKey == "" {
		return "", fmt.Errorf("OpenRouter API key not configured")
	}

	systemPrompt := `You are a telecom expert helper. The user will provide a country and/or operator name (e.g. "Cameroon Orange", "France Free Mobile", "USA Verizon").
Your task is to return a COMMA-SEPARATED list of mobile phone number prefixes (start of the number) for that operator in that country.
Include the country code in the prefix (e.g. +336 for France, +23769 for Cameroon Orange).
Return ONLY the comma-separated list. No JSON, no markdown, no explanation.
If you don't know, return "unknown".
Example Output: +336, +337`

	reqBody := OpenRouterRequest{
		Model: "google/gemini-2.0-flash-exp:free",
		Messages: []Message{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: prompt},
		},
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")
	// OpenRouter specific headers
	req.Header.Set("HTTP-Referer", "https://simly.app")
	req.Header.Set("X-Title", "Simly Platform")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("OpenRouter API failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var openRouterResp OpenRouterResponse
	if err := json.NewDecoder(resp.Body).Decode(&openRouterResp); err != nil {
		return "", err
	}

	if len(openRouterResp.Choices) == 0 {
		return "", fmt.Errorf("no response from AI")
	}

	return strings.TrimSpace(openRouterResp.Choices[0].Message.Content), nil
}
