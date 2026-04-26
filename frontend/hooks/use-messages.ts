"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Message, MessageEvent } from "@/types";

export interface MessageFilter {
  applicationId?: number | null;
  campaignId?: number | null;
  deviceId?: number | null;
  status?: string | null;
  failureCategory?: string | null;
  search?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  limit?: number | null;
  offset?: number | null;
}

export const messageKeys = {
  all: ["messages"] as const,
  list: (filter: MessageFilter) => [...messageKeys.all, "list", filter] as const,
  events: (id: number) => [...messageKeys.all, "events", id] as const,
};

export function useMessages(filter: MessageFilter = {}) {
  return useQuery({
    queryKey: messageKeys.list(filter),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filter.applicationId) params.application_id = String(filter.applicationId);
      if (filter.campaignId) params.campaign_id = String(filter.campaignId);
      if (filter.deviceId) params.device_id = String(filter.deviceId);
      if (filter.status && filter.status !== "all") params.status = filter.status;
      if (filter.failureCategory && filter.failureCategory !== "all") {
        params.failure_category = filter.failureCategory;
      }
      if (filter.search) params.search = filter.search;
      if (filter.startDate) params.start_date = filter.startDate;
      if (filter.endDate) params.end_date = filter.endDate;
      if (filter.limit) params.limit = String(filter.limit);
      if (filter.offset) params.offset = String(filter.offset);
      const res = await api.get<Message[]>("/messages", { params });
      return res.data || [];
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
    staleTime: 10000,
  });
}

export function useMessageEvents(messageId?: number | null) {
  return useQuery({
    queryKey: messageKeys.events(messageId || 0),
    queryFn: async () => {
      const res = await api.get<MessageEvent[]>(`/messages/${messageId}/events`);
      return res.data || [];
    },
    enabled: !!messageId,
    staleTime: 10000,
  });
}
