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

export function useUpdateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await api.put<Application>(`/applications/${id}`, { name });
      return res.data;
    },
    onMutate: async ({ id, name }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: applicationKeys.list() });
      
      // Snapshot previous value
      const previousApps = queryClient.getQueryData<Application[]>(applicationKeys.list());
      
      // Optimistically update
      queryClient.setQueryData<Application[]>(applicationKeys.list(), (old) =>
        old?.map((a) => (a.id === id ? { ...a, name } : a))
      );
      
      return { previousApps };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousApps) {
        queryClient.setQueryData(applicationKeys.list(), context.previousApps);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.list() });
    },
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/applications/${id}`);
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: applicationKeys.list() });
      
      const previousApps = queryClient.getQueryData<Application[]>(applicationKeys.list());
      
      // Optimistically remove
      queryClient.setQueryData<Application[]>(applicationKeys.list(), (old) =>
        old?.filter((a) => a.id !== id)
      );
      
      return { previousApps };
    },
    onError: (_err, _id, context) => {
      if (context?.previousApps) {
        queryClient.setQueryData(applicationKeys.list(), context.previousApps);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.list() });
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
