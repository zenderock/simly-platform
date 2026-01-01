export interface PlanLimits {
  sms_monthly: number;
  sms_burst: number;
  max_devices: number; // -1 = unlimited
  max_sims_per_device: number;
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
}
