"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Message } from "@/types";

export const messageKeys = {
  all: ["messages"] as const,
  list: (appId?: number | null) => [...messageKeys.all, "list", appId] as const,
};

export function useMessages(applicationId?: number | null, campaignId?: number | null) {
  return useQuery({
    queryKey: [...messageKeys.list(applicationId), campaignId],
    queryFn: async () => {
      const params: any = {};
      if (applicationId) params.application_id = applicationId;
      if (campaignId) params.campaign_id = campaignId;
      const res = await api.get<Message[]>("/messages", { params });
      return res.data || [];
    },
    refetchInterval: 15000, // Refetch every 15 seconds
    refetchIntervalInBackground: false,
    staleTime: 10000,
  });
}
