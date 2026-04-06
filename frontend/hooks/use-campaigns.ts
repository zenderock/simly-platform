"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Campaign } from "@/types";

export const campaignKeys = {
  all: ["campaigns"] as const,
  list: (appId?: number | null) => [...campaignKeys.all, "list", appId] as const,
};

export function useCampaigns(applicationId?: number | null) {
  return useQuery({
    queryKey: campaignKeys.list(applicationId),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (applicationId) params.application_id = String(applicationId);
      const res = await api.get<Campaign[]>("/campaigns", { params });
      return res.data || [];
    },
    staleTime: 30000,
  });
}
