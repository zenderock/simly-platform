"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface RequestLog {
  id: number;
  organization_id: number;
  application_id: number;
  api_key_id: number;
  method: string;
  path: string;
  status_code: number;
  duration_ms: number;
  request_body?: string;
  response_body?: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export interface RequestLogFilters {
  status_code?: number;
  path?: string;
  limit?: number;
  offset?: number;
}

export const requestLogKeys = {
  all: ["request-logs"] as const,
  list: (filters?: RequestLogFilters) => [...requestLogKeys.all, "list", filters] as const,
  detail: (id: number) => [...requestLogKeys.all, "detail", id] as const,
};

export function useRequestLogs(filters?: RequestLogFilters) {
  return useQuery({
    queryKey: requestLogKeys.list(filters),
    queryFn: async () => {
      const params: Record<string, string> = {};
      
      if (filters?.status_code) {
        params.status_code = filters.status_code.toString();
      }
      if (filters?.path) {
        params.path = filters.path;
      }
      if (filters?.limit) {
        params.limit = filters.limit.toString();
      }
      if (filters?.offset) {
        params.offset = filters.offset.toString();
      }

      const res = await api.get<RequestLog[]>("/request-logs", { params });
      return res.data || [];
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
}

export function useRequestLog(id: number) {
  return useQuery({
    queryKey: requestLogKeys.detail(id),
    queryFn: async () => {
      const res = await api.get<RequestLog>(`/request-logs/${id}`);
      return res.data;
    },
    enabled: !!id,
    staleTime: 60000,
  });
}
