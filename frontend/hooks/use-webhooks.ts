"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Webhook } from "@/types";

export const webhookKeys = {
  all: ["webhooks"] as const,
  list: (orgId?: number | null) => [...webhookKeys.all, "list", orgId] as const,
};

export function useWebhooks(organizationId?: number | null) {
  return useQuery({
    queryKey: webhookKeys.list(organizationId),
    queryFn: async () => {
      const res = await api.get<Webhook[]>("/webhooks");
      return res.data || [];
    },
    enabled: !!organizationId,
  });
}
