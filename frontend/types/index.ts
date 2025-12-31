
export interface Organization {
  id: number;
  name: string;
  slug: string;
  plan: string;
  created_at: string;
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
  description: string;
  created_at: string;
}

export interface Device {
  id: number;
  organization_id: number;
  name: string;
  model: string;
  status: string;
  last_heartbeat: string;
  battery_level: number;
  signal_strength: string;
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
