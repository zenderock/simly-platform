"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useApplications } from "@/hooks/use-applications";
import { useQueries } from "@tanstack/react-query";
import api from "@/lib/api";
import { APIKey } from "@/types";
import { apiKeyKeys } from "@/hooks/use-api-keys";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IconPlayerPlay,
  IconArrowLeft,
  IconSend,
  IconLoader2,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconClock,
} from "@tabler/icons-react";

// API Endpoints available in the playground
const ENDPOINTS = [
  {
    id: "send-message",
    method: "POST" as const,
    path: "/v1/messages",
    name: "Send SMS",
    description: "Send an SMS message to a phone number",
    hasBody: true,
    bodyFields: [
      {
        name: "to",
        label: "Phone Number",
        placeholder: "+33612345678",
        required: true,
      },
      {
        name: "body",
        label: "Message",
        placeholder: "Hello from Simly!",
        required: true,
        multiline: true,
      },
    ],
  },
  {
    id: "get-message",
    method: "GET" as const,
    path: "/v1/messages/{id}",
    name: "Get Message Status",
    description: "Retrieve the status of a sent message",
    hasBody: false,
    pathParams: [
      {
        name: "id",
        label: "Message ID",
        placeholder: "msg_abc123xyz",
        required: true,
      },
    ],
  },
  {
    id: "launch-campaign",
    method: "POST" as const,
    path: "/v1/campaigns/{id}/launch",
    name: "Launch Campaign",
    description: "Launch a campaign via API",
    hasBody: true,
    pathParams: [
      { name: "id", label: "Campaign ID", placeholder: "123", required: true },
    ],
    bodyFields: [],
  },
  {
    id: "get-campaign",
    method: "GET" as const,
    path: "/v1/campaigns/{id}",
    name: "Get Campaign Status",
    description: "Get campaign details and status",
    hasBody: false,
    pathParams: [
      { name: "id", label: "Campaign ID", placeholder: "123", required: true },
    ],
  },
];

interface APIResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  duration: number;
}

export default function PlaygroundPage() {
  const { data: apps = [], isLoading: appsLoading } = useApplications();
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
  const [manualApiKey, setManualApiKey] = useState<string>("");
  const [selectedEndpoint, setSelectedEndpoint] = useState(ENDPOINTS[0]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<APIResponse | null>(null);
  const [error, setError] = useState<{
    code: string;
    message: string;
    param?: string;
  } | null>(null);

  // Fetch keys for all apps in parallel
  const keysQueries = useQueries({
    queries: apps.map((app) => ({
      queryKey: apiKeyKeys.byApp(app.id),
      queryFn: async () => {
        const res = await api.get<APIKey[]>(
          `/api-keys?application_id=${app.id}`
        );
        return {
          appId: app.id,
          keys: res.data || [],
          isSandbox: app.is_sandbox,
        };
      },
      staleTime: 60000,
      enabled: apps.length > 0,
    })),
  });

  const loading = appsLoading || keysQueries.some((q) => q.isLoading);

  // Flatten all keys with their sandbox status and full key (if available)
  const allKeys: (APIKey & { isSandbox: boolean })[] = [];
  keysQueries.forEach((q) => {
    if (q.data) {
      q.data.keys.forEach((key) => {
        allKeys.push({ ...key, isSandbox: q.data.isSandbox });
      });
    }
  });

  // Auto-select first key when keys are loaded
  useEffect(() => {
    if (allKeys.length > 0 && !selectedKeyId) {
      setSelectedKeyId(allKeys[0].id.toString());
    }
  }, [allKeys, selectedKeyId]);

  // Reset form when endpoint changes
  useEffect(() => {
    setFormData({});
    setResponse(null);
    setError(null);
  }, [selectedEndpoint.id]);

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const buildUrl = (): string => {
    let path = selectedEndpoint.path;
    if (selectedEndpoint.pathParams) {
      selectedEndpoint.pathParams.forEach((param) => {
        path = path.replace(
          `{${param.name}}`,
          formData[param.name] || `{${param.name}}`
        );
      });
    }
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
      "http://localhost:8085";
    return `${baseUrl}${path}`;
  };

  const executeRequest = async () => {
    if (!manualApiKey.trim()) {
      setError({
        code: "no_api_key",
        message: "Please enter your API key to make requests",
      });
      return;
    }

    setIsLoading(true);
    setResponse(null);
    setError(null);

    const startTime = performance.now();

    try {
      const url = buildUrl();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${manualApiKey.trim()}`,
        "Content-Type": "application/json",
      };

      const fetchOptions: RequestInit = {
        method: selectedEndpoint.method,
        headers,
      };

      if (selectedEndpoint.hasBody && selectedEndpoint.bodyFields) {
        const body: Record<string, string> = {};
        selectedEndpoint.bodyFields.forEach((field) => {
          if (formData[field.name]) {
            body[field.name] = formData[field.name];
          }
        });
        fetchOptions.body = JSON.stringify(body);
      }

      const res = await fetch(url, fetchOptions);
      const duration = Math.round(performance.now() - startTime);

      // Extract headers
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseBody: unknown;
      const contentType = res.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        responseBody = await res.json();
      } else {
        responseBody = await res.text();
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        body: responseBody,
        duration,
      });

      // Check if response contains an error
      if (
        !res.ok &&
        typeof responseBody === "object" &&
        responseBody !== null &&
        "error" in responseBody
      ) {
        const errorData = responseBody as {
          error: { code: string; message: string; param?: string };
        };
        setError(errorData.error);
      }
    } catch (err) {
      const duration = Math.round(performance.now() - startTime);
      setResponse({
        status: 0,
        statusText: "Network Error",
        headers: {},
        body: null,
        duration,
      });
      setError({
        code: "network_error",
        message:
          err instanceof Error ? err.message : "Failed to connect to the API",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300)
      return "bg-green-500/10 text-green-600 border-green-500/20";
    if (status >= 400 && status < 500)
      return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    if (status >= 500) return "bg-red-500/10 text-red-600 border-red-500/20";
    return "bg-gray-500/10 text-gray-600 border-gray-500/20";
  };

  return (
    <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-background">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-[10px]">
          <IconPlayerPlay className="size-3.5" />
          API Playground
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Test API Requests
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl leading-relaxed">
          Construct and execute API requests interactively. Test your
          integration without writing code.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Builder */}
        <div className="space-y-4">
          {/* API Key Input */}
          <Card className="shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Authentication</CardTitle>
              <CardDescription>
                Enter your API key to authenticate requests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="sk_live_... or sk_test_..."
                  value={manualApiKey}
                  onChange={(e) => setManualApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the full API key you received when creating it. Keys are
                  only shown once at creation.
                </p>
              </div>

              {/* Quick select from existing keys (shows prefix only) */}
              {!loading && allKeys.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Or select a key to see its prefix:
                  </Label>
                  <Select
                    value={selectedKeyId}
                    onValueChange={(id) => {
                      setSelectedKeyId(id);
                      const key = allKeys.find((k) => k.id.toString() === id);
                      if (key) {
                        // Just show the prefix as a hint, user still needs to enter full key
                        setManualApiKey(key.prefix + "...");
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select to see prefix..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allKeys.map((key) => (
                        <SelectItem key={key.id} value={key.id.toString()}>
                          <span className="flex items-center gap-2">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                key.isSandbox
                                  ? "bg-orange-500/10 text-orange-600"
                                  : "bg-green-500/10 text-green-600"
                              }`}
                            >
                              {key.isSandbox ? "TEST" : "LIVE"}
                            </span>
                            {key.name} ({key.prefix}...)
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {manualApiKey.startsWith("sk_test_") && (
                <p className="text-xs text-orange-600 flex items-center gap-1">
                  <IconAlertTriangle className="size-3" />
                  Sandbox mode: Messages will be simulated, no real SMS sent
                </p>
              )}
            </CardContent>
          </Card>

          {/* Endpoint Selector */}
          <Card className="shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Endpoint</CardTitle>
              <CardDescription>Choose the API endpoint to test</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={selectedEndpoint.id}
                onValueChange={(id) => {
                  const endpoint = ENDPOINTS.find((e) => e.id === id);
                  if (endpoint) setSelectedEndpoint(endpoint);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENDPOINTS.map((endpoint) => (
                    <SelectItem key={endpoint.id} value={endpoint.id}>
                      <span className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            endpoint.method === "POST"
                              ? "bg-green-500/10 text-green-600 border-green-500/20"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                          }
                        >
                          {endpoint.method}
                        </Badge>
                        {endpoint.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant="outline"
                    className={
                      selectedEndpoint.method === "POST"
                        ? "bg-green-500/10 text-green-600 border-green-500/20"
                        : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                    }
                  >
                    {selectedEndpoint.method}
                  </Badge>
                  <code className="text-sm font-mono">
                    {selectedEndpoint.path}
                  </code>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedEndpoint.description}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Request Parameters */}
          <Card className="shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Parameters</CardTitle>
              <CardDescription>
                Configure the request parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Path Parameters */}
              {selectedEndpoint.pathParams?.map((param) => (
                <div key={param.name} className="space-y-2">
                  <Label htmlFor={param.name}>
                    {param.label}
                    {param.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </Label>
                  <Input
                    id={param.name}
                    placeholder={param.placeholder}
                    value={formData[param.name] || ""}
                    onChange={(e) =>
                      handleInputChange(param.name, e.target.value)
                    }
                  />
                </div>
              ))}

              {/* Body Fields */}
              {selectedEndpoint.bodyFields?.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </Label>
                  {field.multiline ? (
                    <Textarea
                      id={field.name}
                      placeholder={field.placeholder}
                      value={formData[field.name] || ""}
                      onChange={(e) =>
                        handleInputChange(field.name, e.target.value)
                      }
                      rows={3}
                    />
                  ) : (
                    <Input
                      id={field.name}
                      placeholder={field.placeholder}
                      value={formData[field.name] || ""}
                      onChange={(e) =>
                        handleInputChange(field.name, e.target.value)
                      }
                    />
                  )}
                </div>
              ))}

              {!selectedEndpoint.pathParams && !selectedEndpoint.bodyFields && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No parameters required for this endpoint
                </p>
              )}
            </CardContent>
          </Card>

          {/* Execute Button */}
          <Button
            onClick={executeRequest}
            disabled={isLoading || !manualApiKey.trim()}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <IconLoader2 className="size-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <IconSend className="size-4" />
                Send Request
              </>
            )}
          </Button>
        </div>

        {/* Response Panel */}
        <div className="space-y-4">
          <Card className="h-full shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Response</CardTitle>
                  <CardDescription>View the API response</CardDescription>
                </div>
                {response && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={getStatusColor(response.status)}
                    >
                      {response.status} {response.statusText}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <IconClock className="size-3" />
                      {response.duration}ms
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!response && !error && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <IconPlayerPlay className="size-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Execute a request to see the response here
                  </p>
                </div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4"
                >
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                    <div className="flex items-start gap-3">
                      <div className="size-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                        <IconX className="size-4 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-red-600">
                          Error: {error.code}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {error.message}
                        </p>
                        {error.param && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Parameter:{" "}
                            <code className="bg-muted px-1 rounded">
                              {error.param}
                            </code>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {response && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Success indicator for 2xx responses */}
                  {response.status >= 200 && response.status < 300 && (
                    <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                      <div className="flex items-center gap-2">
                        <IconCheck className="size-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">
                          Request successful
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Response Headers */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Headers</h4>
                    <div className="rounded-lg border bg-zinc-950 p-3 overflow-x-auto max-h-32">
                      <pre className="text-xs text-zinc-400 font-mono">
                        {Object.entries(response.headers).map(
                          ([key, value]) => (
                            <div key={key}>
                              <span className="text-zinc-500">{key}:</span>{" "}
                              {value}
                            </div>
                          )
                        )}
                        {Object.keys(response.headers).length === 0 && (
                          <span className="text-zinc-500">No headers</span>
                        )}
                      </pre>
                    </div>
                  </div>

                  {/* Response Body */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Body</h4>
                    <div className="rounded-lg border bg-zinc-950 p-4 overflow-x-auto max-h-96">
                      <pre className="text-sm text-zinc-300 font-mono">
                        {response.body
                          ? typeof response.body === "string"
                            ? response.body
                            : JSON.stringify(response.body, null, 2)
                          : "No response body"}
                      </pre>
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
