"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { DashboardStats } from "@/types";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  stats: (appId?: number | null) => [...dashboardKeys.all, "stats", appId] as const,
};

export function useDashboardStats(applicationId?: number | null) {
  return useQuery({
    queryKey: dashboardKeys.stats(applicationId),
    queryFn: async () => {
      const params = applicationId ? { application_id: applicationId } : {};
      const res = await api.get<DashboardStats>("/dashboard/stats", { params });
      return res.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchIntervalInBackground: false,
    staleTime: 20000,
  });
}
