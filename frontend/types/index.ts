
export interface Organization {
  id: number;
  name: string;
  slug: string;
  plan: string;
  sms_monthly_limit: number;
  sms_burst_limit: number;
  max_devices: number;
  max_sims_per_device: number;
  max_applications: number;
  max_contacts: number;
  max_campaigns: number;
  max_recipients_per_campaign: number;
  auto_save_contacts?: boolean;
  is_white_label?: boolean;
  branding_name?: string | null;
  branding_logo_url?: string | null;
  branding_color?: string | null;
  created_at: string;
}

export interface SimCard {
  id: number;
  device_id: number;
  slot_index: number;
  phone_number: string;
  operator: string;
  is_active: boolean;
  supported_prefixes?: string;
  daily_limit: number;
  sent_today: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Application {
  id: number;
  organization_id: number;
  name: string;
  description?: string;
  logo_url?: string;
  is_sandbox: boolean;
  slack_webhook_url?: string;
  ntfy_topic?: string;
  created_at: string;
  updated_at: string;
}

export interface APIKey {
  id: number;
  organization_id: number;
  application_id: number;
  name: string;
  prefix: string;
  key?: string; // Only on creation
  last_used_at?: string;
  created_at: string;
  updated_at?: string;
}


export interface Device {
  id: number;
  organization_id: number;
  name: string;
  model: string;
  status: string;
  battery_level: number;
  signal_strength: number;
  tags: string[];
  sim_cards: SimCard[];
  requires_setup: boolean;
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  organization_id: number;
  application_id?: number;
  campaign_id?: number;
  device_id?: number;
  to: string;
  from?: string;
  body: string;
  status: string;
  direction: string;
  priority: string;
  application_name?: string;
  device_name?: string;
  scheduled_at?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: number;
  organization_id: number;
  application_id?: number;
  name: string;
  template_body: string;
  status: string;
  total_messages: number;
  sent_messages: number;
  failed_messages: number;
  scheduled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RequeueResult {
  matched_count: number;
  requeued_count: number;
}

export interface DashboardStats {
  total_messages: number;
  sent_messages: number;
  delivered_messages: number;
  failed_messages: number;
  pending_messages: number;
  active_devices: number;
  total_devices: number;
  current_month_cost: number;
  prev_total_messages: number;
  prev_sent_messages: number;
  prev_delivered_messages: number;
  prev_failed_messages: number;
}

export interface TrafficStat {
  date: string;
  count: number;
}

export interface Alert {
  id: number;
  organization_id: number;
  type: string;
  severity: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Webhook {
  id: number;
  organization_id: number;
  application_id?: number;
  url: string;
  secret: string;
  event_types: string;
  created_at: string;
}
