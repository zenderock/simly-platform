"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export type SupportedLanguage = "curl" | "javascript" | "python" | "php" | "go";

export interface CodeSnippetProps {
  /** The endpoint path (e.g., "/v1/messages") */
  endpoint: string;
  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "DELETE";
  /** Request body for POST/PUT requests */
  body?: Record<string, unknown>;
  /** API key to insert into snippets (will be masked) */
  apiKey?: string;
  /** Languages to display (defaults to all) */
  languages?: SupportedLanguage[];
  /** Additional className */
  className?: string;
}

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  curl: "cURL",
  javascript: "JavaScript",
  python: "Python",
  php: "PHP",
  go: "Go",
};

const ALL_LANGUAGES: SupportedLanguage[] = ["curl", "javascript", "python", "php", "go"];

/**
 * Masks an API key for display, showing only prefix and last 4 chars
 * e.g., "sk_live_abc123xyz" -> "sk_live_...xyz"
 */
function maskApiKey(key: string): string {
  if (!key) return "sk_live_...";
  if (key.length <= 12) return key;
  const prefix = key.substring(0, 8); // "sk_live_" or "sk_test_"
  const suffix = key.substring(key.length - 4);
  return `${prefix}...${suffix}`;
}

/**
 * Generates code snippets for different programming languages
 */
export function generateCodeSnippet(
  language: SupportedLanguage,
  endpoint: string,
  method: string,
  body?: Record<string, unknown>,
  apiKey?: string
): string {
  const maskedKey = maskApiKey(apiKey || "sk_live_your_api_key_here");
  const baseUrl = "https://server-simly.servelink.space";
  const fullUrl = `${baseUrl}${endpoint}`;
  const bodyJson = body ? JSON.stringify(body, null, 2) : null;

  switch (language) {
    case "curl":
      return generateCurlSnippet(fullUrl, method, bodyJson, maskedKey);
    case "javascript":
      return generateJavaScriptSnippet(fullUrl, method, bodyJson, maskedKey);
    case "python":
      return generatePythonSnippet(fullUrl, method, bodyJson, maskedKey);
    case "php":
      return generatePhpSnippet(fullUrl, method, bodyJson, maskedKey);
    case "go":
      return generateGoSnippet(fullUrl, method, bodyJson, maskedKey);
    default:
      return "";
  }
}

function generateCurlSnippet(url: string, method: string, body: string | null, apiKey: string): string {
  let snippet = `# Send SMS via Simly API
curl -X ${method} "${url}" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json"`;
  
  if (body) {
    snippet += ` \\
  -d '${body.replace(/\n/g, "\n  ")}'`;
  }
  
  return snippet;
}

function generateJavaScriptSnippet(url: string, method: string, body: string | null, apiKey: string): string {
  return `// Send SMS via Simly API
// Best practice: Store API key in environment variables
const response = await fetch("${url}", {
  method: "${method}",
  headers: {
    "Authorization": "Bearer ${apiKey}",
    "Content-Type": "application/json",
  },${body ? `
  body: JSON.stringify(${body}),` : ""}
});

// Handle the response
if (!response.ok) {
  const error = await response.json();
  console.error("API Error:", error.error.message);
  throw new Error(error.error.message);
}

const data = await response.json();
console.log("Message sent:", data.id);`;
}

function generatePythonSnippet(url: string, method: string, body: string | null, apiKey: string): string {
  const pythonBody = body ? body.replace(/"/g, "'").replace(/: /g, ": ") : null;
  
  return `# Send SMS via Simly API
# Best practice: Store API key in environment variables
import requests
import os

api_key = os.environ.get("SIMLY_API_KEY", "${apiKey}")

response = requests.${method.toLowerCase()}(
    "${url}",
    headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    },${pythonBody ? `
    json=${pythonBody.replace(/\n/g, "\n    ")},` : ""}
)

# Handle the response
if not response.ok:
    error = response.json()
    print(f"API Error: {error['error']['message']}")
    raise Exception(error["error"]["message"])

data = response.json()
print(f"Message sent: {data['id']}")`;
}

function generatePhpSnippet(url: string, method: string, body: string | null, apiKey: string): string {
  const phpBody = body 
    ? body
        .replace(/"([^"]+)":/g, "'$1' =>")
        .replace(/: "/g, " '")
        .replace(/"/g, "'")
        .replace(/,\n/g, ",\n    ")
    : null;

  return `<?php
// Send SMS via Simly API
// Best practice: Store API key in environment variables
$apiKey = getenv('SIMLY_API_KEY') ?: '${apiKey}';

$ch = curl_init();

curl_setopt_array($ch, [
    CURLOPT_URL => '${url}',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => '${method}',
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json',
    ],${phpBody ? `
    CURLOPT_POSTFIELDS => json_encode([
        ${phpBody.replace(/\n/g, "\n        ")}
    ]),` : ""}
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Handle the response
$data = json_decode($response, true);

if ($httpCode >= 400) {
    echo "API Error: " . $data['error']['message'];
    throw new Exception($data['error']['message']);
}

echo "Message sent: " . $data['id'];`;
}

function generateGoSnippet(url: string, method: string, body: string | null, apiKey: string): string {
  return `package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

// Send SMS via Simly API
// Best practice: Store API key in environment variables
func main() {
	apiKey := os.Getenv("SIMLY_API_KEY")
	if apiKey == "" {
		apiKey = "${apiKey}"
	}
${body ? `
	payload := map[string]interface{}${body.replace(/"/g, '"').replace(/\n/g, "\n\t")}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		panic(err)
	}

	req, err := http.NewRequest("${method}", "${url}", bytes.NewBuffer(jsonData))` : `
	req, err := http.NewRequest("${method}", "${url}", nil)`}
	if err != nil {
		panic(err)
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	// Handle the response
	body, _ := io.ReadAll(resp.Body)
	
	if resp.StatusCode >= 400 {
		var errorResp map[string]interface{}
		json.Unmarshal(body, &errorResp)
		fmt.Printf("API Error: %v\\n", errorResp["error"])
		return
	}

	var data map[string]interface{}
	json.Unmarshal(body, &data)
	fmt.Printf("Message sent: %v\\n", data["id"])
}`;
}

export function CodeSnippet({
  endpoint,
  method,
  body,
  apiKey,
  languages = ALL_LANGUAGES,
  className,
}: CodeSnippetProps) {
  const [copiedLang, setCopiedLang] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SupportedLanguage>(languages[0]);

  const handleCopy = async (language: SupportedLanguage) => {
    const code = generateCodeSnippet(language, endpoint, method, body, apiKey);
    await navigator.clipboard.writeText(code);
    setCopiedLang(language);
    setTimeout(() => setCopiedLang(null), 2000);
  };

  return (
    <div className={cn("rounded-lg border bg-zinc-950 overflow-hidden", className)}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SupportedLanguage)}>
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
          <TabsList className="bg-transparent h-auto p-0 gap-1">
            {languages.map((lang) => (
              <TabsTrigger
                key={lang}
                value={lang}
                className="px-3 py-1.5 text-xs font-medium text-zinc-400 data-[state=active]:text-white data-[state=active]:bg-zinc-800 rounded-md"
              >
                {LANGUAGE_LABELS[lang]}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopy(activeTab)}
            className="h-7 px-2 text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            {copiedLang === activeTab ? (
              <>
                <IconCheck className="size-3.5" />
                <span className="text-xs">Copied!</span>
              </>
            ) : (
              <>
                <IconCopy className="size-3.5" />
                <span className="text-xs">Copy</span>
              </>
            )}
          </Button>
        </div>
        
        {languages.map((lang) => (
          <TabsContent key={lang} value={lang} className="m-0">
            <pre className="p-4 overflow-x-auto text-sm text-zinc-300 font-mono leading-relaxed">
              <code>{generateCodeSnippet(lang, endpoint, method, body, apiKey)}</code>
            </pre>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
