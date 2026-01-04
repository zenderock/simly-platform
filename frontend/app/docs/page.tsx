"use client";

import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  APIEndpointDoc,
  APIEndpoint,
} from "@/components/developers/api-endpoint-doc";
import {
  IconBook,
  IconSend,
  IconMessage,
  IconShieldCheck,
  IconAlertTriangle,
  IconServer,
  IconLock,
  IconRocket,
} from "@tabler/icons-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";

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

export default function DocsPage() {
  return (
    <div className="bg-[#05080A] min-h-screen flex flex-col text-white selection:bg-[#8c52ff]/30 selection:text-[#8c52ff]">
      <Header />

      <main className="grow flex flex-col md:flex-row max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        {/* Sidebar */}
        <aside className="hidden md:block w-64 pt-8 pb-8 pr-8 border-r border-white/10 sticky top-20 h-[calc(100vh-80px)] overflow-y-auto">
          <div className="flex items-center gap-2 text-[#8c52ff] font-bold uppercase tracking-[0.2em] text-[10px] mb-6">
            <IconBook className="size-3.5" />
            API Documentation
          </div>
          <nav className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white/90 uppercase tracking-wider">
                Getting Started
              </h3>
              <ul className="space-y-1">
                <li>
                  <a
                    href="#authentication"
                    className="block text-sm text-white/60 hover:text-[#8c52ff] transition-colors py-1"
                  >
                    Authentication
                  </a>
                </li>
                <li>
                  <a
                    href="#base-url"
                    className="block text-sm text-white/60 hover:text-[#8c52ff] transition-colors py-1"
                  >
                    Base URL
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white/90 uppercase tracking-wider">
                Resources
              </h3>
              <ul className="space-y-1">
                <li>
                  <a
                    href="#messages"
                    className="block text-sm text-white/60 hover:text-[#8c52ff] transition-colors py-1"
                  >
                    Messages
                  </a>
                </li>
                <li>
                  <a
                    href="#campaigns"
                    className="block text-sm text-white/60 hover:text-[#8c52ff] transition-colors py-1"
                  >
                    Campaigns
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white/90 uppercase tracking-wider">
                Reference
              </h3>
              <ul className="space-y-1">
                <li>
                  <a
                    href="#statuses"
                    className="block text-sm text-white/60 hover:text-[#8c52ff] transition-colors py-1"
                  >
                    Message Statuses
                  </a>
                </li>
                <li>
                  <a
                    href="#errors"
                    className="block text-sm text-white/60 hover:text-[#8c52ff] transition-colors py-1"
                  >
                    Error Handling
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 py-8 md:pl-10 min-w-0">
          <div className="space-y-16">
            {/* Intro */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#8c52ff] font-bold uppercase tracking-[0.2em] text-[10px] md:hidden mb-2">
                <IconBook className="size-3.5" />
                API Documentation
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white mb-4">
                API Reference
              </h1>
              <p className="text-white/60 text-lg leading-relaxed max-w-2xl">
                Complete reference for the Simly Public API. All endpoints use
                the{" "}
                <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-white/90">
                  /v1/
                </code>{" "}
                prefix.
              </p>
              <div className="flex items-center gap-4 text-sm text-white/40 pt-2">
                <span>v1.0.0</span>
                <span>•</span>
                <span>OAS 3.0</span>
              </div>
            </div>

            {/* Authentication Section */}
            <section id="authentication" className="scroll-mt-24">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/20">
                    <IconLock className="size-4 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    Authentication
                  </h2>
                </div>

                <p className="text-white/60 leading-relaxed">
                  All API requests must include your API key in the{" "}
                  <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-white/90">
                    Authorization
                  </code>{" "}
                  header using the Bearer scheme:
                </p>

                <div className="rounded-lg border border-white/10 bg-black/50 p-4 overflow-x-auto relative group">
                  <div className="absolute top-2 right-2 text-[10px] uppercase font-bold text-white/30">
                    HTTP Header
                  </div>
                  <pre className="text-sm text-zinc-300 font-mono">
                    Authorization: Bearer sk_live_your_api_key_here
                  </pre>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20">
                        sk_test_*
                      </Badge>
                      <span className="text-sm font-medium">Test Keys</span>
                    </div>
                    <p className="text-xs text-white/60">
                      Use test keys for development and testing. Messages are
                      simulated and no real SMS is sent.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20">
                        sk_live_*
                      </Badge>
                      <span className="text-sm font-medium">Live Keys</span>
                    </div>
                    <p className="text-xs text-white/60">
                      Use live keys for production. Messages are sent via your
                      connected Android devices.
                    </p>
                  </div>
                </div>
              </motion.div>
            </section>

            {/* Base URL Section */}
            <section id="base-url" className="scroll-mt-24">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <IconServer className="size-4 text-blue-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Base URL</h2>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/50 p-4 overflow-x-auto">
                  <pre className="text-sm text-zinc-300 font-mono">
                    https://server-simly.servelink.space/v1
                  </pre>
                </div>
                <p className="text-sm text-white/60 mt-2">
                  All API endpoints are relative to this base URL.
                </p>
              </motion.div>
            </section>

            {/* Endpoints Section */}
            <section id="messages" className="scroll-mt-24">
              <div className="space-y-8">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="size-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                    <IconSend className="size-4 text-indigo-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Messages</h2>
                    <p className="text-sm text-white/60">
                      Send and retrieve SMS messages
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {API_ENDPOINTS.map((endpoint, index) => (
                    <motion.div
                      key={`${endpoint.method}-${endpoint.path}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + index * 0.05 }}
                    >
                      <APIEndpointDoc
                        endpoint={endpoint}
                        apiKey="sk_live_your_api_key"
                        defaultExpanded={index === 0}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            {/* Campaigns Section */}
            <section id="campaigns" className="scroll-mt-24">
              <div className="space-y-8">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="size-8 rounded-lg bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                    <IconRocket className="size-4 text-pink-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Campaigns</h2>
                    <p className="text-sm text-white/60">
                      Manage and trigger SMS campaigns
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {CAMPAIGN_ENDPOINTS.map((endpoint, index) => (
                    <motion.div
                      key={`${endpoint.method}-${endpoint.path}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + index * 0.05 }}
                    >
                      <APIEndpointDoc
                        endpoint={endpoint}
                        apiKey="sk_live_your_api_key"
                        defaultExpanded={false}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            {/* Message Statuses Section */}
            <section id="statuses" className="scroll-mt-24">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                    <IconMessage className="size-4 text-purple-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    Message Statuses
                  </h2>
                </div>
                <p className="text-white/60">
                  Possible values for the message status field.
                </p>
                <div className="rounded-lg border border-white/10 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-white/80 border-b border-white/10">
                          Status
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-white/80 border-b border-white/10">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {MESSAGE_STATUSES.map((item) => (
                        <tr key={item.status} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <code className="text-xs bg-[#8c52ff]/10 text-[#8c52ff] border border-[#8c52ff]/20 px-1.5 py-0.5 rounded font-mono">
                              {item.status}
                            </code>
                          </td>
                          <td className="px-4 py-3 text-white/60">
                            {item.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </section>

            {/* Error Handling Section */}
            <section id="errors" className="scroll-mt-24">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
                    <IconAlertTriangle className="size-4 text-red-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    Error Handling
                  </h2>
                </div>

                <p className="text-sm text-white/60">
                  All errors follow a consistent JSON format with an{" "}
                  <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono">
                    error
                  </code>{" "}
                  object containing the error details:
                </p>
                <div className="rounded-lg border border-white/10 bg-black/50 p-4 overflow-x-auto">
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

                <div className="space-y-4 pt-4">
                  <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                    Error Codes
                  </h4>
                  <div className="rounded-lg border border-white/10 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold text-white/80 border-b border-white/10">
                            HTTP Status
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-white/80 border-b border-white/10">
                            Error Code
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-white/80 border-b border-white/10">
                            Description
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        <tr className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className="bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20"
                            >
                              400
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded font-mono">
                              invalid_request
                            </code>
                          </td>
                          <td className="px-4 py-3 text-white/60">
                            Request validation failed
                          </td>
                        </tr>
                        <tr className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className="bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20"
                            >
                              400
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded font-mono">
                              missing_parameter
                            </code>
                          </td>
                          <td className="px-4 py-3 text-white/60">
                            Required parameter is missing
                          </td>
                        </tr>
                        <tr className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                            >
                              401
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded font-mono">
                              invalid_api_key
                            </code>
                          </td>
                          <td className="px-4 py-3 text-white/60">
                            API key is invalid or revoked
                          </td>
                        </tr>
                        <tr className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                            >
                              404
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded font-mono">
                              resource_not_found
                            </code>
                          </td>
                          <td className="px-4 py-3 text-white/60">
                            Requested resource does not exist
                          </td>
                        </tr>
                        <tr className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className="bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20"
                            >
                              429
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded font-mono">
                              rate_limit_exceeded
                            </code>
                          </td>
                          <td className="px-4 py-3 text-white/60">
                            Too many requests, check Retry-After header
                          </td>
                        </tr>
                        <tr className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                            >
                              500
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded font-mono">
                              internal_error
                            </code>
                          </td>
                          <td className="px-4 py-3 text-white/60">
                            Server error, please retry later
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                    Rate Limiting
                  </h4>
                  <p className="text-sm text-white/60">
                    When rate limited, the response includes a{" "}
                    <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono">
                      Retry-After
                    </code>{" "}
                    header indicating how many seconds to wait before retrying.
                  </p>
                  <div className="rounded-lg border border-white/10 bg-black/50 p-4 overflow-x-auto">
                    <pre className="text-sm text-zinc-300 font-mono">
                      {`HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704189600`}
                    </pre>
                  </div>
                </div>
              </motion.div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
