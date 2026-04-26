"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { MessageEvent, SupportMessage } from "@/types";

export interface SupportMessageFilter {
  search?: string;
  organizationId?: string;
  status?: string;
  failureCategory?: string;
  startDate?: string;
  endDate?: string;
}

export const supportMessageKeys = {
  all: ["support-messages"] as const,
  list: (filter: SupportMessageFilter) =>
    [...supportMessageKeys.all, "list", filter] as const,
  events: (id: number) => [...supportMessageKeys.all, "events", id] as const,
};

export function useSupportMessages(filter: SupportMessageFilter) {
  return useQuery({
    queryKey: supportMessageKeys.list(filter),
    queryFn: async () => {
      const params: Record<string, string> = { limit: "100" };
      if (filter.search) params.search = filter.search;
      if (filter.organizationId) params.organization_id = filter.organizationId;
      if (filter.status && filter.status !== "all") params.status = filter.status;
      if (filter.failureCategory && filter.failureCategory !== "all") {
        params.failure_category = filter.failureCategory;
      }
      if (filter.startDate) params.start_date = filter.startDate;
      if (filter.endDate) params.end_date = filter.endDate;

      const res = await api.get<SupportMessage[]>("/support/messages", {
        params,
      });
      return res.data || [];
    },
    refetchInterval: 30000,
  });
}

export function useSupportMessageEvents(messageId?: number | null) {
  return useQuery({
    queryKey: supportMessageKeys.events(messageId || 0),
    queryFn: async () => {
      const res = await api.get<MessageEvent[]>(
        `/support/messages/${messageId}/events`
      );
      return res.data || [];
    },
    enabled: !!messageId,
    staleTime: 10000,
  });
}
