import api from "../api";

export interface Campaign {
  id: number;
  name: string;
  template_body: string;
  list_id: number | null;
  device_id: number | null;
  sim_slot: number | null;
  status: "draft" | "scheduled" | "queued" | "processing" | "completed" | "failed";
  scheduled_at: string | null;
  total_messages: number;
  sent_messages: number;
  failed_messages: number;
  created_at: string;
}

export interface CreateCampaignRequest {
  name: string;
  template_body: string;
  list_id: number | null;
  device_id: number;
  sim_slot?: number | null;
  scheduled_at?: string;
}

export interface CampaignAnalytics {
  campaign_id: number;
  total: number;
  sent: number;
  failed: number;
  pending: number;
  delivered: number;
  by_status: Record<string, number>;
}

export const listCampaigns = async (): Promise<Campaign[]> => {
  const { data } = await api.get("/campaigns");
  return data;
};

export const getCampaign = async (id: number): Promise<Campaign> => {
  const { data } = await api.get(`/campaigns/${id}`);
  return data;
};

export const getCampaignAnalytics = async (id: number): Promise<CampaignAnalytics> => {
  const { data } = await api.get(`/campaigns/${id}/analytics`);
  return data;
};

export const createCampaign = async (data: CreateCampaignRequest): Promise<Campaign> => {
  const { data: res } = await api.post("/campaigns", data);
  return res;
};

export const deleteCampaign = async (id: number): Promise<void> => {
  await api.delete(`/campaigns/${id}`);
};

export const launchCampaign = async (id: number): Promise<void> => {
  await api.post(`/campaigns/${id}/launch`);
};
