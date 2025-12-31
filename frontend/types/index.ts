
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
