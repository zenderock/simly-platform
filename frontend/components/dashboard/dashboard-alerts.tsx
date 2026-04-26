"use client";

import React from "react";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { useApplicationStore } from "@/store/application-store";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function DashboardAlerts() {
  const activeAppId = useApplicationStore((state) => state.activeAppId);
  const { data: stats } = useDashboardStats(activeAppId);

  if (!stats) return null;

  const queue =
    (stats.queued_messages || 0) +
    (stats.pending_messages || 0) +
    (stats.scheduled_messages || 0);

  if (queue > 50) {
    return (
      <Alert variant="destructive" className="mb-6 bg-red-500/10 text-red-600 border-red-500/50">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="font-bold">High Message Queue Warning</AlertTitle>
        <AlertDescription className="font-medium text-xs mt-1">
          There are {queue.toLocaleString()} messages currently stuck in the pending queue.
          This high volume indicates a possible delivery bottleneck or disconnected devices.
          Please check your device connections or application settings.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
