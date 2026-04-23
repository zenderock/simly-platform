export interface PlanLimits {
  sms_rate_per_message: number; // in cents
  sms_burst: number;
  max_devices: number; // -1 = unlimited
  max_sims_per_device: number;
  max_applications: number; // -1 = unlimited
  max_contacts: number; // -1 = unlimited
  max_campaigns: number; // -1 = unlimited
  max_recipients_per_campaign: number; // -1 = unlimited
  sms_monthly: number; // Monthly SMS limit (-1 = unlimited)
}

export interface Plan {
  id: string;
  name: string;
  price: number; // in cents
  period: string;
  description: string;
  features: string[];
  limits: PlanLimits;
  popular: boolean;
  stripe_price_id?: string;
  trial_available?: boolean;
  trial_days?: number | null;
  trial_ends_at?: string | null;
}
