"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { RequeueResult } from "@/types";
import { messageKeys } from "./use-messages";
import { campaignKeys } from "./use-campaigns";

export interface RequeuePayload {
  campaign_id?: number | null;
  start_date?: string | null;
  end_date?: string | null;
}

export function useRequeueMessages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RequeuePayload) => {
      const body: Record<string, unknown> = {};
      if (payload.campaign_id) body.campaign_id = payload.campaign_id;
      if (payload.start_date) body.start_date = payload.start_date;
      if (payload.end_date) body.end_date = payload.end_date;
      const res = await api.post<RequeueResult>("/messages/requeue", body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageKeys.all });
      queryClient.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

export function useRequeueOneMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: number) => {
      const res = await api.post<RequeueResult>(`/messages/${messageId}/requeue`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageKeys.all });
      queryClient.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}
