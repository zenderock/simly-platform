
export interface Organization {
  id: number;
  name: string;
  slug: string;
  plan: string;
  sms_monthly_limit: number;
  sms_burst_limit: number;
  max_devices: number;
  max_sims_per_device: number;
  created_at: string;
}

export interface SimCard {
  id: number;
  device_id: number;
  slot_index: number;
  phone_number: string;
  operator: string;
  is_active: boolean;
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
  is_sandbox: boolean;
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
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  organization_id: number;
  application_id?: number;
  device_id?: number;
  to: string;
  body: string;
  status: string;
  direction: string;
  priority: string;
  application_name?: string;
  device_name?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_messages: number;
  sent_messages: number;
  delivered_messages: number;
  failed_messages: number;
  pending_messages: number;
  active_devices: number;
  total_devices: number;
}

export interface TrafficStat {
  date: string;
  count: number;
}
