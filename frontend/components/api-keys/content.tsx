"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { Application, APIKey } from "@/types";
import { APIKeyCard } from "@/components/api-keys/api-key-card";
import { CreateKeyDialog } from "@/components/api-keys/create-key-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { useApplications } from "@/hooks/use-applications";
import {
  useApiKeysByApp,
  useRevokeApiKey,
  apiKeyKeys,
} from "@/hooks/use-api-keys";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import {
  IconInfoSquareRounded,
  IconKey,
  IconLock,
  IconShieldCheck,
  IconShieldExclamation,
} from "@tabler/icons-react";
import { Terminal } from "lucide-react";

export function APIKeysContent() {
  const queryClient = useQueryClient();
  const { data: apps = [], isLoading: appsLoading } = useApplications();
  const revokeMutation = useRevokeApiKey();

  // Fetch keys for all apps in parallel
  const keysQueries = useQueries({
    queries: apps.map((app) => ({
      queryKey: apiKeyKeys.byApp(app.id),
      queryFn: async () => {
        const res = await api.get<APIKey[]>(
          `/api-keys?application_id=${app.id}`
        );
        return { appId: app.id, keys: res.data || [] };
      },
      staleTime: 60000,
      enabled: apps.length > 0,
    })),
  });

  const loading = appsLoading || keysQueries.some((q) => q.isLoading);

  const keysByApp: Record<number, APIKey[]> = {};
  keysQueries.forEach((q) => {
    if (q.data) {
      keysByApp[q.data.appId] = q.data.keys;
    }
  });

  const handleRevoke = async (id: number) => {
    if (
      confirm(
        "Are you sure? This will immediately stop any integration using this key."
      )
    ) {
      revokeMutation.mutate(id);
    }
  };

  const handleKeyCreated = () => {
    // Invalidation is handled automatically by the useCreateApiKey hook
  };

  return (
    <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 space-y-8 bg-background">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-[10px]">
            <IconLock className="size-3.5" />
            Security & Access
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl leading-relaxed">
            Generate and manage access tokens for your applications. All
            requests are rate-limited based on your current organization plan.
          </p>
        </div>
        <CreateKeyDialog applications={apps} onCreated={handleKeyCreated} />
      </div>

      {loading ? (
        <div className="space-y-8">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-4 w-32" />
              <div className="grid gap-4">
                <Skeleton className="h-[72px] w-full rounded-xl" />
                <Skeleton className="h-[72px] w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : apps.length > 0 ? (
        <div className="space-y-12 pb-10">
          {apps.map((app) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  {app.is_sandbox ? (
                    <div className="size-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <IconShieldExclamation className="size-4 text-orange-600" />
                    </div>
                  ) : (
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <IconShieldCheck className="size-4 text-primary" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold tracking-tight">
                      {app.name}
                    </h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                      {app.is_sandbox
                        ? "Sandbox Environment"
                        : "Production Environment"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[11px] font-medium text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Terminal className="size-3" />
                    {keysByApp[app.id]?.length || 0} Keys
                  </span>
                </div>
              </div>

              <div className="grid gap-3">
                <AnimatePresence mode="popLayout">
                  {keysByApp[app.id] && keysByApp[app.id].length > 0 ? (
                    keysByApp[app.id].map((apiKey) => (
                      <APIKeyCard
                        key={apiKey.id}
                        apiKey={apiKey}
                        isSandbox={app.is_sandbox}
                        onRevoke={handleRevoke}
                      />
                    ))
                  ) : (
                    <div className="py-8 flex flex-col items-center justify-center text-center border translate-y-2 border-dashed rounded-xl bg-zinc-50/50 dark:bg-zinc-900/10">
                      <IconKey className="size-6 text-zinc-300 mb-2" />
                      <p className="text-xs text-muted-foreground">
                        No active keys for this application
                      </p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-center border rounded-2xl bg-zinc-50/20 border-dashed">
          <h3 className="text-lg font-semibold">No Applications Found</h3>
          <p className="text-muted-foreground text-sm max-w-[250px] mt-1">
            You need to create an application first to generate API keys.
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => (window.location.href = "/applications")}
          >
            Go to Applications
          </Button>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-xl border bg-[#8c52ff]/5 p-4 sm:p-6 flex gap-4">
        <div className="size-10 bg-[#8c52ff]/10 rounded-xl flex items-center justify-center shrink-0">
          <IconInfoSquareRounded className="size-5 text-[#8c52ff]" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold tracking-tight">
            Understanding Environments
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
            <strong>Sandbox Keys</strong> allow you to test your integration
            without sending real SMS. The backend will simulate various outcomes
            (delivered, failed, latencies) to help you build resilient
            integrations.
            <strong>Production Keys</strong> trigger real SMS sends via your
            connected Android devices.
          </p>
        </div>
      </div>
    </main>
  );
}
