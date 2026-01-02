"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Application } from "@/types";

export const applicationKeys = {
  all: ["applications"] as const,
  list: () => [...applicationKeys.all, "list"] as const,
  detail: (id: number) => [...applicationKeys.all, "detail", id] as const,
};

export function useApplications() {
  return useQuery({
    queryKey: applicationKeys.list(),
    queryFn: async () => {
      const res = await api.get<Application[]>("/applications");
      return res.data || [];
    },
    staleTime: 60000, // Applications don't change often - 1 minute
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/applications/${id}`);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<Application[]>(applicationKeys.list(), (old) =>
        old?.filter((a) => a.id !== deletedId)
      );
    },
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; is_sandbox: boolean }) => {
      const res = await api.post<Application>("/applications", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.list() });
    },
  });
}
