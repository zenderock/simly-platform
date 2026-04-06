"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Message } from "@/types";

export interface MessageFilter {
  applicationId?: number | null;
  campaignId?: number | null;
  startDate?: string | null;
  endDate?: string | null;
}

export const messageKeys = {
  all: ["messages"] as const,
  list: (filter: MessageFilter) => [...messageKeys.all, "list", filter] as const,
};

export function useMessages(filter: MessageFilter = {}) {
  return useQuery({
    queryKey: messageKeys.list(filter),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filter.applicationId) params.application_id = String(filter.applicationId);
      if (filter.campaignId) params.campaign_id = String(filter.campaignId);
      if (filter.startDate) params.start_date = filter.startDate;
      if (filter.endDate) params.end_date = filter.endDate;
      const res = await api.get<Message[]>("/messages", { params });
      return res.data || [];
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
    staleTime: 10000,
  });
}
