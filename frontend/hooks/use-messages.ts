"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Message } from "@/types";

export const messageKeys = {
  all: ["messages"] as const,
  list: (appId?: number | null) => [...messageKeys.all, "list", appId] as const,
};

export function useMessages(applicationId?: number | null) {
  return useQuery({
    queryKey: messageKeys.list(applicationId),
    queryFn: async () => {
      const params = applicationId ? { application_id: applicationId } : {};
      const res = await api.get<Message[]>("/messages", { params });
      return res.data || [];
    },
    refetchInterval: 15000, // Refetch every 15 seconds
    refetchIntervalInBackground: false,
    staleTime: 10000,
  });
}
