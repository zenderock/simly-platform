"use client";

import { useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { CodeSnippet } from "@/components/developers/code-snippet";
import {
  IconCode,
  IconBook,
  IconPlayerPlay,
  IconList,
  IconRocket,
  IconKey,
  IconWebhook,
  IconArrowRight,
} from "@tabler/icons-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DevelopersPage() {
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
          keys: res.data || [],
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
    if (q.data) {
      q.data.keys.forEach((key) => {
        allKeys.push({ ...key, isSandbox: q.data.isSandbox });
      });
    }
  });

  const selectedKey = allKeys.find((k) => k.id.toString() === selectedKeyId);

  const quickLinks = [
    {
      title: "API Documentation",
      description: "Complete reference for all endpoints",
      href: "/developers/docs",
      icon: IconBook,
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      title: "API Playground",
      description: "Test API calls interactively",
      href: "/developers/playground",
      icon: IconPlayerPlay,
      color: "bg-green-500/10 text-green-600",
    },
    {
      title: "Request Logs",
      description: "Debug and monitor API requests",
      href: "/developers/logs",
      icon: IconList,
      color: "bg-purple-500/10 text-purple-600",
    },
    {
      title: "API Keys",
      description: "Manage your authentication tokens",
      href: "/api-keys",
      icon: IconKey,
      color: "bg-orange-500/10 text-orange-600",
    },
    {
      title: "Webhooks",
      description: "Configure event notifications",
      href: "/webhooks",
      icon: IconWebhook,
      color: "bg-pink-500/10 text-pink-600",
    },
  ];

  const steps = [
    {
      number: 1,
      title: "Get your API Key",
      description:
        "Create an API key from the API Keys page. Use sk_test_* keys for sandbox testing.",
    },
    {
      number: 2,
      title: "Send your first SMS",
      description:
        "Make a POST request to /v1/messages with your recipient and message body.",
    },
    {
      number: 3,
      title: "Check delivery status",
      description:
        "Query the message status or configure webhooks for real-time updates.",
    },
  ];

  return (
    <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 space-y-8 bg-background">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-[10px]">
            <IconCode className="size-3.5" />
            Developer Portal
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            API Integration
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl leading-relaxed">
            Everything you need to integrate SMS sending into your application.
            Explore our documentation, test in the playground, and monitor your
            requests.
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {quickLinks.map((link, index) => (
          <motion.div
            key={link.href}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link href={link.href}>
              <Card className="h-full hover:border-primary/50 transition-all cursor-pointer group shadow-none">
                <CardContent className="p-4 flex flex-col gap-3">
                  <div
                    className={`size-10 rounded-lg ${link.color} flex items-center justify-center`}
                  >
                    <link.icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                      {link.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {link.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Start Guide */}
      <Card className="shadow-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <IconRocket className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Quick Start Guide</CardTitle>
              <CardDescription>
                Get started with the Simly API in minutes
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {steps.map((step) => (
              <div key={step.number} className="flex gap-3">
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                  {step.number}
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{step.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* API Key Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg bg-muted/50 border">
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
              <Button variant="outline" size="sm" asChild>
                <Link href="/api-keys">
                  Create API Key
                  <IconArrowRight className="size-3.5 ml-1" />
                </Link>
              </Button>
            )}
          </div>

          {/* Code Example */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Send an SMS</h4>
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                POST /v1/messages
              </code>
            </div>
            <CodeSnippet
              endpoint="/v1/messages"
              method="POST"
              body={{
                to: "+33612345678",
                body: "Hello from Simly!",
              }}
              apiKey={selectedKey?.prefix}
            />
          </div>

          {/* Response Example */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Example Response</h4>
            <div className="rounded-lg border bg-zinc-950 p-4 overflow-x-auto">
              <pre className="text-sm text-zinc-300 font-mono">
                {`{
  "id": "msg_abc123xyz",
  "status": "pending",
  "to": "+33612345678",
  "body": "Hello from Simly!",
  "created_at": "2026-01-02T10:30:00Z"
}`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Check Message Status</CardTitle>
            <CardDescription>
              Query the delivery status of a sent message
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeSnippet
              endpoint="/v1/messages/{message_id}"
              method="GET"
              apiKey={selectedKey?.prefix}
              languages={["curl", "javascript"]}
            />
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Error Handling</CardTitle>
            <CardDescription>
              All errors follow a consistent JSON format
            </CardDescription>
          </CardHeader>
          <CardContent>
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
            <div className="mt-4 space-y-2">
              <p className="text-xs text-muted-foreground">
                Common error codes:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <code className="bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded">
                    400
                  </code>
                  <span className="text-muted-foreground">invalid_request</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded">
                    401
                  </code>
                  <span className="text-muted-foreground">invalid_api_key</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-orange-500/10 text-orange-600 px-1.5 py-0.5 rounded">
                    429
                  </code>
                  <span className="text-muted-foreground">
                    rate_limit_exceeded
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded">
                    404
                  </code>
                  <span className="text-muted-foreground">
                    resource_not_found
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Box */}
      <div className="rounded-xl border bg-[#8c52ff]/5 p-4 sm:p-6 flex gap-4">
        <div className="size-10 bg-[#8c52ff]/10 rounded-xl flex items-center justify-center shrink-0">
          <IconCode className="size-5 text-[#8c52ff]" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold tracking-tight">Need Help?</h4>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
            Check out our{" "}
            <Link
              href="/developers/docs"
              className="text-primary hover:underline"
            >
              API Documentation
            </Link>{" "}
            for detailed endpoint references, or use the{" "}
            <Link
              href="/developers/playground"
              className="text-primary hover:underline"
            >
              API Playground
            </Link>{" "}
            to test requests interactively. You can also view your{" "}
            <Link
              href="/developers/logs"
              className="text-primary hover:underline"
            >
              Request Logs
            </Link>{" "}
            to debug any integration issues.
          </p>
        </div>
      </div>
    </main>
  );
}
