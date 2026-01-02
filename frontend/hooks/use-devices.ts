"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Device } from "@/types";

export const deviceKeys = {
  all: ["devices"] as const,
  list: () => [...deviceKeys.all, "list"] as const,
  detail: (id: number) => [...deviceKeys.all, "detail", id] as const,
};

export function useDevices() {
  return useQuery({
    queryKey: deviceKeys.list(),
    queryFn: async () => {
      const res = await api.get<Device[]>("/devices");
      return res.data || [];
    },
    refetchInterval: 15000, // Refetch every 15 seconds
    refetchIntervalInBackground: false, // Don't refetch when tab is not visible
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}

export function useDevice(id: number) {
  return useQuery({
    queryKey: deviceKeys.detail(id),
    queryFn: async () => {
      const res = await api.get<Device>(`/devices/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useDeleteDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/devices/${id}`);
      return id;
    },
    onSuccess: (deletedId) => {
      // Update the cache by removing the deleted device
      queryClient.setQueryData<Device[]>(deviceKeys.list(), (old) =>
        old?.filter((d) => d.id !== deletedId)
      );
    },
  });
}
