"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Crown,
  Zap,
  Building2,
  MessageSquare,
  Smartphone,
  Shield,
  Headphones,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { Plan } from "@/types/plan";

export default function PlansPage() {
  const { organizations, organizationId, refreshOrganizations } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const currentOrg = organizations.find((org) => org.id === organizationId);

  useEffect(() => {
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
    fetchPlans();
  }, []);

  const handleUpgrade = async (planId: string) => {
    setUpgrading(planId);
    try {
      await api.put("/organizations/current/plan", { plan: planId });
      await refreshOrganizations();
    } catch (error) {
      console.error("Failed to update plan:", error);
    } finally {
      setUpgrading(null);
    }
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(0)}`;
  const currentPlanId = currentOrg?.plan?.toLowerCase() || "starter";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Scale your SMS operations with plans designed for every stage of
          growth
        </p>
        {currentOrg && (
          <Badge variant="secondary" className="text-sm">
            Current plan: {currentOrg.plan}
          </Badge>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          return (
            <Card
              key={plan.id}
              className={`relative ${plan.popular ? "ring-2 ring-primary shadow-lg scale-105" : ""} ${isCurrent ? "border-primary" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="space-y-2">
                  <CardTitle className="text-2xl flex items-center justify-center gap-2">
                    {plan.id === "enterprise" && (
                      <Crown className="size-5 text-yellow-500" />
                    )}
                    {plan.id === "professional" && (
                      <Zap className="size-5 text-blue-500" />
                    )}
                    {plan.id === "starter" && (
                      <Building2 className="size-5 text-green-500" />
                    )}
                    {plan.name}
                  </CardTitle>
                  <div className="space-y-1">
                    <div className="text-4xl font-bold">
                      {formatPrice(plan.price)}
                      <span className="text-lg font-normal text-muted-foreground">
                        /{plan.period}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{plan.description}</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <MessageSquare className="size-5 mx-auto mb-1 text-blue-500" />
                    <div className="text-sm font-medium">
                      {plan.limits.sms_monthly.toLocaleString()} SMS
                    </div>
                    <div className="text-xs text-muted-foreground">
                      per month
                    </div>
                  </div>
                  <div className="text-center">
                    <Smartphone className="size-5 mx-auto mb-1 text-green-500" />
                    <div className="text-sm font-medium">
                      {plan.limits.max_devices === -1
                        ? "Unlimited"
                        : plan.limits.max_devices}{" "}
                      devices
                    </div>
                    <div className="text-xs text-muted-foreground">maximum</div>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="size-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                <Button
                  className="w-full"
                  variant={
                    isCurrent ? "secondary" : plan.popular ? "default" : "outline"
                  }
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrent || upgrading !== null}
                >
                  {upgrading === plan.id ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : isCurrent ? (
                    <>
                      <Crown className="size-4 mr-2" />
                      Current Plan
                    </>
                  ) : (
                    `Upgrade to ${plan.name}`
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

   
      {/* FAQ or Contact */}
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Need a Custom Plan?</h2>
        <p className="text-muted-foreground">
          Contact our sales team for enterprise solutions and volume discounts
        </p>
        <Button variant="outline">Contact Sales</Button>
      </div>
    </div>
  );
}
