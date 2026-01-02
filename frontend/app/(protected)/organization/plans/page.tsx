"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { Plan } from "@/types/plan";
import { useToast } from "@/components/ui/use-toast";
import { IconRocket, IconBolt, IconBuilding, IconMessage, IconDeviceMobile, IconUsers, IconCategory2 } from "@tabler/icons-react";

export default function PlansPage() {
  const { organizations, organizationId, refreshOrganizations } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const currentOrg = organizations.find((org) => org.id === organizationId);

  useEffect(() => {
    fetchPlans();
    if (searchParams.get("success")) {
      toast({ title: "Billing updated successfully", variant: "default" });
      refreshOrganizations();
    }
    if (searchParams.get("canceled")) {
      toast({ title: "Billing update canceled", variant: "default" });
    }
  }, [searchParams]);

  const fetchPlans = async () => {
    try {
      const response = await api.get<Plan[]>("/organizations/plans");
      setPlans(response.data);
    } catch (error) {
      console.error("Failed to fetch plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (priceId: string) => {
    if (!priceId) {
      toast({ title: "Plan configuration error", variant: "destructive" });
      return;
    }
    setUpgrading(priceId);
    try {
      const response = await api.post("/billing/checkout", { price_id: priceId });
      window.location.href = response.data.url;
    } catch (error) {
      console.error("Failed to start checkout", error);
      toast({ title: "Failed to start checkout", variant: "destructive" });
      setUpgrading(null);
    }
  };

  const handlePortal = async () => {
    setUpgrading("portal");
    try {
      const response = await api.post("/billing/portal");
      window.location.href = response.data.url;
    } catch (error) {
      console.error("Portal failed", error);
      toast({ title: "Failed to open billing settings", variant: "destructive" });
      setUpgrading(null);
    }
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(0)}`;
  const currentPlanId = currentOrg?.plan?.toLowerCase() || "free";

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case "agency": return <IconRocket className="size-5" />;
      case "pro": return <IconBolt className="size-5" />;
      default: return <IconBuilding className="size-5" />;
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case "agency": return "text-amber-500 bg-amber-500/10";
      case "pro": return "text-violet-500 bg-violet-500/10";
      default: return "text-emerald-500 bg-emerald-500/10";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-10">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Choose your plan</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Scale your SMS operations with the right plan. All plans include core features.
        </p>
        
        {currentOrg && currentPlanId !== "free" && (
          <button 
            onClick={handlePortal} 
            disabled={upgrading !== null}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mt-2"
          >
            {upgrading === "portal" && <Loader2 className="size-3 animate-spin" />}
            Manage subscription →
          </button>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isFree = plan.id === "free";
          const isPopular = plan.popular;

          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border p-6 flex flex-col transition-colors ${
                isPopular 
                  ? "border-primary bg-primary/2 dark:bg-primary/3" 
                  : "border-border hover:border-muted-foreground/30"
              } ${isCurrent ? "ring-2 ring-primary/20" : ""}`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-4">
                  <Badge className="bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5">
                    <Sparkles className="size-3 mr-1" />
                    Popular
                  </Badge>
                </div>
              )}

              {/* Plan Header */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getPlanColor(plan.id)}`}>
                    {getPlanIcon(plan.id)}
                  </div>
                  <div>
                    <h3 className="font-semibold">{plan.name}</h3>
                    {isCurrent && (
                      <span className="text-xs text-muted-foreground">Current plan</span>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{formatPrice(plan.price)}</span>
                  <span className="text-muted-foreground text-sm">/{plan.period}</span>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {plan.description}
                </p>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="rounded-lg bg-muted/50 p-2 text-center">
                  <IconMessage className="size-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-semibold text-sm">
                    {formatPrice(plan.limits.sms_rate_per_message)}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Per SMS</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-2 text-center">
                  <IconCategory2 className="size-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-semibold text-sm">
                    {plan.limits.max_applications === -1 ? "∞" : plan.limits.max_applications}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Apps</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-2 text-center">
                  <IconUsers className="size-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-semibold text-sm">
                    {plan.limits.max_contacts === -1 ? "∞" : plan.limits.max_contacts}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Contacts</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-2 text-center">
                  <IconDeviceMobile className="size-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-semibold text-sm">
                    {plan.limits.max_devices === -1 ? "∞" : plan.limits.max_devices}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Devices</div>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2.5 text-sm">
                    <Check className="size-4 text-primary shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Button
                className="w-full"
                variant={isCurrent ? "secondary" : isPopular ? "default" : "outline"}
                onClick={() => !isCurrent && plan.stripe_price_id && handleCheckout(plan.stripe_price_id)}
                disabled={isCurrent || upgrading !== null || (!plan.stripe_price_id && !isFree)}
              >
                {upgrading === plan.stripe_price_id ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : isCurrent ? (
                  "Current plan"
                ) : !plan.stripe_price_id && !isFree ? (
                  "Contact sales"
                ) : (
                  `Upgrade to ${plan.name}`
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Enterprise CTA */}
      <div className="text-center py-8 border-t">
        <p className="text-sm text-muted-foreground mb-3">
          Need higher limits or custom features?
        </p>
        <Button variant="ghost" size="sm">
          Contact our sales team →
        </Button>
      </div>
    </div>
  );
}
