"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useApplications } from "@/hooks/use-applications";
import { useQueries } from "@tanstack/react-query";
import api from "@/lib/api";
import { APIKey } from "@/types";
import { apiKeyKeys } from "@/hooks/use-api-keys";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  APIEndpointDoc,
  APIEndpoint,
} from "@/components/developers/api-endpoint-doc";
import {
  IconBook,
  IconArrowLeft,
  IconSend,
  IconMessage,
  IconShieldCheck,
  IconAlertTriangle,
  IconRocket,
  IconDeviceMobile,
  IconBrandApple,
} from "@tabler/icons-react";

const DEVICE_ENDPOINTS: APIEndpoint[] = [
  {
    method: "GET",
    path: "/v1/devices",
    summary: "List devices and SIM cards",
    description:
      "Retrieve a list of all Android devices connected to your organization, including their current status, battery level, and available SIM slots with their respective IDs and indices.",
    headers: [
      {
        name: "Authorization",
        required: true,
        description: "Bearer token with your API key",
        example: "Bearer sk_live_...",
      },
    ],
    responseExample: [
      {
        id: 123,
        name: "Office Gateway 1",
        model: "Samsung S21",
        status: "online",
        battery: 85,
        signal: 4,
        last_seen_at: "2026-01-02T10:30:00Z",
        requires_setup: false,
        sim_cards: [
          {
            slot_index: 0,
            operator: "Orange",
            phone_number: "+33612345678",
            is_active: true,
            supported_prefixes: "6,7",
          },
          {
            slot_index: 1,
            operator: "Free",
            phone_number: "+33788990011",
            is_active: true,
            supported_prefixes: "06,07",
          },
        ],
      },
    ],
    errorResponses: [
      {
        status: 401,
        code: "invalid_api_key",
        description: "API key is invalid",
      },
      {
        status: 500,
        code: "internal_error",
        description: "Server error",
      },
    ],
  },
];
const WHITE_LABEL_ENDPOINTS: APIEndpoint[] = [
  {
    method: "POST",
    path: "/v1/devices/link-token",
    summary: "Generate a device link token",
    description:
      "Creates a one-time token used to link a mobile device via QR code scan. Display the returned token as a QR code in your app, then poll the status endpoint to confirm the link. Requires a White-Label plan.",
    headers: [
      {
        name: "Authorization",
        required: true,
        description: "Bearer token with your API key",
        example: "Bearer sk_live_...",
      },
    ],
    responseExample: {
      token: "lnk_a1b2c3d4e5f6",
      expires_at: "2026-01-02T10:35:00Z",
      status: "pending",
    },
    errorResponses: [
      {
        status: 403,
        code: "forbidden",
        description: "White-label plan required",
      },
      {
        status: 401,
        code: "invalid_api_key",
        description: "API key is invalid",
      },
      {
        status: 500,
        code: "internal_error",
        description: "Server error",
      },
    ],
  },
  {
    method: "GET",
    path: "/v1/devices/link-token/{token}",
    summary: "Get link token status",
    description:
      "Poll this endpoint after displaying the QR code to know when the device has been successfully linked. Status transitions from `pending` → `used` once the mobile app scans the QR code. Requires a White-Label plan.",
    headers: [
      {
        name: "Authorization",
        required: true,
        description: "Bearer token with your API key",
        example: "Bearer sk_live_...",
      },
    ],
    pathParams: [
      {
        name: "token",
        type: "string",
        required: true,
        description: "The link token returned by POST /v1/devices/link-token",
        example: "lnk_a1b2c3d4e5f6",
      },
    ],
    responseExample: {
      token: "lnk_a1b2c3d4e5f6",
      status: "used",
      device_id: 42,
      expires_at: "2026-01-02T10:35:00Z",
    },
    errorResponses: [
      {
        status: 403,
        code: "forbidden",
        description: "White-label plan required",
      },
      {
        status: 404,
        code: "resource_not_found",
        description: "Token not found or expired",
      },
      {
        status: 401,
        code: "invalid_api_key",
        description: "API key is invalid",
      },
    ],
  },
  {
    method: "GET",
    path: "/v1/branding",
    summary: "Get branding configuration",
    description:
      "Returns the branding configuration for your white-label app (app name, logo URL, primary color). Called by the mobile app at startup to apply your custom branding. Falls back to Simly defaults if not configured. Requires a White-Label plan.",
    headers: [
      {
        name: "Authorization",
        required: true,
        description: "Bearer token with your API key",
        example: "Bearer sk_live_...",
      },
    ],
    responseExample: {
      app_name: "Ayoub Gateway",
      logo_url: "https://r2.simly.io/logos/ayoub-logo.png",
      primary_color: "#1A73E8",
    },
    errorResponses: [
      {
        status: 403,
        code: "forbidden",
        description: "White-label plan required",
      },
      {
        status: 401,
        code: "invalid_api_key",
        description: "API key is invalid",
      },
    ],
  },
];

const CAMPAIGN_ENDPOINTS: APIEndpoint[] = [
  {
    method: "POST",
    path: "/v1/campaigns/{id}/launch",
    summary: "Launch a campaign",
    description:
      "Triggers the sending process for a previously created campaign draft. The campaign must be in 'draft' status.",
    headers: [
      {
        name: "Authorization",
        required: true,
        description: "Bearer token with your API key",
        example: "Bearer sk_live_...",
      },
    ],
    pathParams: [
      {
        name: "id",
        type: "string",
        required: true,
        description: "The unique campaign ID (e.g., 123)",
        example: "123",
      },
    ],
    responseExample: {
      status: "success",
      message: "Campaign launched successfully",
      campaign_id: 123,
    },
    errorResponses: [
      {
        status: 400,
        code: "invalid_request",
        description: "Campaign is not in draft status or already processing",
      },
      {
        status: 404,
        code: "resource_not_found",
        description: "Campaign not found",
      },
      {
        status: 401,
        code: "invalid_api_key",
        description: "API key is invalid",
      },
      {
        status: 500,
        code: "internal_error",
        description: "Server error",
      },
    ],
  },
];
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// API Endpoints Definition
const API_ENDPOINTS: APIEndpoint[] = [
  {
    method: "POST",
    path: "/v1/messages",
    summary: "Send an SMS message",
    description:
      "Send an SMS message to a phone number. The message will be queued for delivery via one of your connected Android devices. Use sk_test_* keys for sandbox mode (no real SMS sent) or sk_live_* keys for production delivery.",
    headers: [
      {
        name: "Authorization",
        required: true,
        description: "Bearer token with your API key",
        example: "Bearer sk_live_...",
      },
      {
        name: "Content-Type",
        required: true,
        description: "Must be application/json",
        example: "application/json",
      },
    ],
    bodyParams: [
      {
        name: "to",
        type: "string",
        required: true,
        description: "Recipient phone number in E.164 format",
        example: "+33612345678",
      },
      {
        name: "body",
        type: "string",
        required: true,
        description: "Message content (max 1600 characters)",
        example: "Hello from Simly!",
      },
      {
        name: "device_id",
        type: "integer",
        required: false,
        description: "Force sending via a specific device ID",
        example: "123",
      },
      {
        name: "sim_slot",
        type: "integer",
        required: false,
        description: "Sim slot to use (0 or 1)",
        example: "0",
      },
    ],
    requestExample: {
      to: "+33612345678",
      body: "Hello from Simly!",
      device_id: 123,
      sim_slot: 0,
    },
    responseExample: {
      id: "msg_abc123xyz",
      status: "pending",
      to: "+33612345678",
      body: "Hello from Simly!",
      created_at: "2026-01-02T10:30:00Z",
    },
    errorResponses: [
      {
        status: 400,
        code: "invalid_request",
        description:
          "Request validation failed (e.g., invalid phone number format)",
      },
      {
        status: 400,
        code: "missing_parameter",
        description: "Required parameter is missing",
      },
      {
        status: 401,
        code: "invalid_api_key",
        description: "API key is invalid, revoked, or missing",
      },
      {
        status: 429,
        code: "rate_limit_exceeded",
        description: "Too many requests, check Retry-After header",
      },
      {
        status: 500,
        code: "internal_error",
        description: "Server error, please retry later",
      },
    ],
  },
  {
    method: "POST",
    path: "/v1/messages/otp",
    summary: "Send an OTP message",
    description:
      "Send a high-priority One-Time Password (OTP) message. This endpoint enforces a strict character limit (80 chars) and automatically assigns 'critical' priority to ensure instant delivery. Ideal for verification codes.",
    headers: [
      {
        name: "Authorization",
        required: true,
        description: "Bearer token with your API key",
        example: "Bearer sk_live_...",
      },
      {
        name: "Content-Type",
        required: true,
        description: "Must be application/json",
        example: "application/json",
      },
    ],
    bodyParams: [
      {
        name: "to",
        type: "string",
        required: true,
        description: "Recipient phone number in E.164 format",
        example: "+33612345678",
      },
      {
        name: "body",
        type: "string",
        required: true,
        description: "OTP content (max 80 characters)",
        example: "Your Simly code is: 123456",
      },
    ],
    requestExample: {
      to: "+33612345678",
      body: "Your Simly code is: 123456",
    },
    responseExample: {
      id: "msg_otp789",
      status: "pending",
      to: "+33612345678",
      body: "Your Simly code is: 123456",
      created_at: "2026-01-02T10:30:00Z",
    },
    errorResponses: [
      {
        status: 400,
        code: "invalid_request",
        description: "Body exceeds 80 characters or invalid phone number",
      },
      {
        status: 429,
        code: "rate_limit_exceeded",
        description: "Too many OTP requests",
      },
    ],
  },
  {
    method: "GET",
    path: "/v1/messages/{id}",
    summary: "Get message status",
    description:
      "Retrieve the current status and details of a previously sent message. Use this endpoint to check delivery status or get message metadata.",
    headers: [
      {
        name: "Authorization",
        required: true,
        description: "Bearer token with your API key",
        example: "Bearer sk_live_...",
      },
    ],
    pathParams: [
      {
        name: "id",
        type: "string",
        required: true,
        description: "The unique message identifier returned when sending",
        example: "msg_abc123xyz",
      },
    ],
    responseExample: {
      id: "msg_abc123xyz",
      status: "delivered",
      to: "+33612345678",
      body: "Hello from Simly!",
      created_at: "2026-01-02T10:30:00Z",
      processed_at: "2026-01-02T10:30:05Z",
    },
    errorResponses: [
      {
        status: 401,
        code: "invalid_api_key",
        description: "API key is invalid, revoked, or missing",
      },
      {
        status: 404,
        code: "resource_not_found",
        description: "Message with the specified ID was not found",
      },
      {
        status: 500,
        code: "internal_error",
        description: "Server error, please retry later",
      },
    ],
  },
];

// Message statuses
const MESSAGE_STATUSES = [
  {
    status: "pending",
    description: "Message is queued and waiting to be sent",
  },
  {
    status: "sending",
    description: "Message is being sent via a connected device",
  },
  {
    status: "sent",
    description: "Message was sent successfully by the device",
  },
  {
    status: "delivered",
    description: "Message was delivered to the recipient",
  },
  { status: "failed", description: "Message delivery failed" },
];

export default function APIDocsPage() {
  const { data: apps = [], isLoading: appsLoading } = useApplications();
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");

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
          keys: Array.isArray(res.data) ? res.data : [],
          isSandbox: app.is_sandbox,
        };
      },
      staleTime: 60000,
      enabled: apps.length > 0,
    })),
  });

  const loading = appsLoading || keysQueries.some((q) => q.isLoading);

  // Flatten all keys with their sandbox status
  const allKeys: (APIKey & { isSandbox: boolean })[] = [];
  keysQueries.forEach((q) => {
    if (q.data && Array.isArray(q.data.keys)) {
      q.data.keys.forEach((key) => {
        allKeys.push({ ...key, isSandbox: q.data.isSandbox });
      });
    }
  });

  const selectedKey = allKeys.find((k) => k.id.toString() === selectedKeyId);

  return (
    <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 space-y-8 bg-background">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-[10px]">
            <IconBook className="size-3.5" />
            API Documentation
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            API Reference
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl leading-relaxed">
            Complete reference for the Simly Public API. All endpoints use the{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/v1/</code>{" "}
            prefix.
          </p>
        </div>
      </div>

      {/* API Key Selector */}
      <Card className="shadow-none">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium">
                Select an API Key for code examples
              </p>
              <p className="text-xs text-muted-foreground">
                Your key will be inserted into the code snippets below
              </p>
            </div>
            {loading ? (
              <Skeleton className="h-9 w-[200px]" />
            ) : allKeys.length > 0 ? (
              <Select value={selectedKeyId} onValueChange={setSelectedKeyId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select a key..." />
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
                        {key.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Link
                href="/api-keys"
                className="text-sm text-primary hover:underline"
              >
                Create an API Key →
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Authentication Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="shadow-none">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <IconShieldCheck className="size-4 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Authentication</CardTitle>
                <CardDescription>
                  How to authenticate your API requests
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              All API requests must include your API key in the{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                Authorization
              </code>{" "}
              header using the Bearer scheme:
            </p>
            <div className="rounded-lg border bg-zinc-950 p-4 overflow-x-auto">
              <pre className="text-sm text-zinc-300 font-mono">
                Authorization: Bearer sk_live_your_api_key_here
              </pre>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                    sk_test_*
                  </Badge>
                  <span className="text-sm font-medium">Test Keys</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use test keys for development and testing. Messages are
                  simulated and no real SMS is sent.
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    sk_live_*
                  </Badge>
                  <span className="text-sm font-medium">Live Keys</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use live keys for production. Messages are sent via your
                  connected Android devices.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Base URL Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-lg">Base URL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-zinc-950 p-4 overflow-x-auto">
              <pre className="text-sm text-zinc-300 font-mono">
                https://server-simly.servelink.space/v1
              </pre>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              All API endpoints are relative to this base URL.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Endpoints Section */}
      <div className="space-y-12">
        {/* Messages */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <IconSend className="size-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Messages</h2>
              <p className="text-sm text-muted-foreground">
                Send and retrieve SMS messages
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {API_ENDPOINTS.map((endpoint, index) => (
              <motion.div
                key={`${endpoint.method}-${endpoint.path}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
              >
                <APIEndpointDoc
                  endpoint={endpoint}
                  apiKey={selectedKey?.prefix}
                  defaultExpanded={index === 0}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Devices */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <IconDeviceMobile className="size-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Devices</h2>
              <p className="text-sm text-muted-foreground">
                List and monitor your Android devices
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {DEVICE_ENDPOINTS.map((endpoint, index) => (
              <motion.div
                key={`${endpoint.method}-${endpoint.path}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
              >
                <APIEndpointDoc
                  endpoint={endpoint}
                  apiKey={selectedKey?.prefix}
                  defaultExpanded={true}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* White-Label */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <IconBrandApple className="size-4 text-violet-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">White-Label</h2>
                <Badge className="bg-violet-500/10 text-violet-600 border-violet-500/20 text-[10px]">
                  $120/month plan
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Device linking via QR code and branding configuration for your own app
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {WHITE_LABEL_ENDPOINTS.map((endpoint, index) => (
              <motion.div
                key={`${endpoint.method}-${endpoint.path}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
              >
                <APIEndpointDoc
                  endpoint={endpoint}
                  apiKey={selectedKey?.prefix}
                  defaultExpanded={false}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Campaigns */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
              <IconRocket className="size-4 text-pink-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Campaigns</h2>
              <p className="text-sm text-muted-foreground">
                Manage and trigger SMS campaigns
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {CAMPAIGN_ENDPOINTS.map((endpoint, index) => (
              <motion.div
                key={`${endpoint.method}-${endpoint.path}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
              >
                <APIEndpointDoc
                  endpoint={endpoint}
                  apiKey={selectedKey?.prefix}
                  defaultExpanded={false}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Message Statuses Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="shadow-none">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <IconMessage className="size-4 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Message Statuses</CardTitle>
                <CardDescription>
                  Possible values for the message status field
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-left px-4 py-2 font-medium">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {MESSAGE_STATUSES.map((item) => (
                    <tr key={item.status}>
                      <td className="px-4 py-2">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                          {item.status}
                        </code>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {item.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Error Handling Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card className="shadow-none">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <IconAlertTriangle className="size-4 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Error Handling</CardTitle>
                <CardDescription>
                  Understanding API error responses
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              All errors follow a consistent JSON format with an{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                error
              </code>{" "}
              object containing the error details:
            </p>
            <div className="rounded-lg border bg-zinc-950 p-4 overflow-x-auto">
              <pre className="text-sm text-zinc-300 font-mono">
                {`{
  "error": {
    "code": "invalid_request",
    "message": "The 'to' field must be a valid E.164 phone number",
    "param": "to"
  }
}`}
              </pre>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Error Codes</h4>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">
                        HTTP Status
                      </th>
                      <th className="text-left px-4 py-2 font-medium">
                        Error Code
                      </th>
                      <th className="text-left px-4 py-2 font-medium">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-4 py-2">
                        <Badge
                          variant="outline"
                          className="bg-orange-500/10 text-orange-600 border-orange-500/20"
                        >
                          400
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                          invalid_request
                        </code>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Request validation failed
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">
                        <Badge
                          variant="outline"
                          className="bg-orange-500/10 text-orange-600 border-orange-500/20"
                        >
                          400
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                          missing_parameter
                        </code>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Required parameter is missing
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">
                        <Badge
                          variant="outline"
                          className="bg-red-500/10 text-red-600 border-red-500/20"
                        >
                          401
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                          invalid_api_key
                        </code>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        API key is invalid or revoked
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">
                        <Badge
                          variant="outline"
                          className="bg-red-500/10 text-red-600 border-red-500/20"
                        >
                          403
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                          forbidden
                        </code>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Feature requires White-Label plan
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">
                        <Badge
                          variant="outline"
                          className="bg-red-500/10 text-red-600 border-red-500/20"
                        >
                          404
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                          resource_not_found
                        </code>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Requested resource does not exist
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">
                        <Badge
                          variant="outline"
                          className="bg-orange-500/10 text-orange-600 border-orange-500/20"
                        >
                          429
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                          rate_limit_exceeded
                        </code>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Too many requests, check Retry-After header
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">
                        <Badge
                          variant="outline"
                          className="bg-red-500/10 text-red-600 border-red-500/20"
                        >
                          500
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                          internal_error
                        </code>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Server error, please retry later
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Rate Limiting</h4>
              <p className="text-sm text-muted-foreground">
                When rate limited, the response includes a{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                  Retry-After
                </code>{" "}
                header indicating how many seconds to wait before retrying.
              </p>
              <div className="rounded-lg border bg-zinc-950 p-4 overflow-x-auto">
                <pre className="text-sm text-zinc-300 font-mono">
                  {`HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704189600`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
