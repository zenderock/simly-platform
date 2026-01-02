"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { APIKey, Application } from "@/types";

export const apiKeyKeys = {
  all: ["api-keys"] as const,
  byApp: (appId: number) => [...apiKeyKeys.all, "app", appId] as const,
};

export function useApiKeysByApp(appId: number) {
  return useQuery({
    queryKey: apiKeyKeys.byApp(appId),
    queryFn: async () => {
      const res = await api.get<APIKey[]>(`/api-keys?application_id=${appId}`);
      return res.data || [];
    },
    enabled: !!appId,
    staleTime: 60000, // API keys don't change often
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api-keys/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.all });
    },
  });
}
