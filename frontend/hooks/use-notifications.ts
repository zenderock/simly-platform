"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Alert } from "@/types";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => [...notificationKeys.all, "list"] as const,
};

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: async () => {
      const res = await api.get<Alert[]>("/alerts");
      return res.data || [];
    },
    refetchInterval: 30000, // Check for new notifications every 30 seconds
    staleTime: 15000,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: number) => {
      await api.post(`/alerts/${alertId}/read`);
      return alertId;
    },
    onSuccess: (alertId) => {
      queryClient.setQueryData<Alert[]>(notificationKeys.list(), (old) =>
        old?.map((alert) =>
          alert.id === alertId ? { ...alert, is_read: true } : alert
        )
      );
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertIds: number[]) => {
      await Promise.all(alertIds.map((id) => api.post(`/alerts/${id}/read`)));
      return alertIds;
    },
    onSuccess: () => {
      queryClient.setQueryData<Alert[]>(notificationKeys.list(), (old) =>
        old?.map((alert) => ({ ...alert, is_read: true }))
      );
    },
  });
}

export function useCreateTestAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.post("/alerts/test");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
    },
  });
}
