"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Crown,
  Zap,
  Building2,
  MessageSquare,
  Smartphone,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { Plan } from "@/types/plan";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";

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
        toast({ title: "Plan configuration error: Missing Price ID", variant: "destructive" });
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

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-12 p-8 py-12">
      <div className="text-center space-y-4">
        <motion.div
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5 }}
        >
             <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">Simple, Transparent Pricing</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan for your messaging needs. Upgrade or downgrade at any time.
            </p>
        </motion.div>
        
        {currentOrg && (
             <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center gap-3 pt-4"
             >
                <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-full border border-border/50 backdrop-blur-sm">
                    <span className="text-sm text-muted-foreground">Current Status:</span>
                    <Badge variant={currentPlanId === "free" ? "secondary" : "default"} className="text-sm px-3 py-0.5 uppercase tracking-wider font-semibold">
                       {currentOrg.plan}
                    </Badge>
                </div>

                {currentPlanId !== "free" && (
                    <Button variant="ghost" size="sm" onClick={handlePortal} disabled={upgrading !== null} className="text-muted-foreground hover:text-primary transition-colors">
                         {upgrading === "portal" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                         Manage Subscription →
                    </Button>
                )}
            </motion.div>
        )}
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-8 lg:grid-cols-3 max-w-7xl mx-auto items-start"
      >
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isFree = plan.id === "free";
          const isPopular = plan.popular;
          
          return (
            <motion.div key={plan.id} variants={item} className="h-full">
                <Card 
                  className={`relative flex flex-col h-full transition-all duration-300 ${
                    isPopular 
                        ? "border-primary shadow-lg scale-105 z-10 bg-background/60 backdrop-blur-xl" 
                        : "bg-card/50 hover:bg-card/80 border-border/50 hover:border-border hover:shadow-md"
                    } ${isCurrent ? "ring-1 ring-primary/50" : ""}`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-4 py-1 text-xs font-bold uppercase tracking-widest shadow-lg">
                        Best Value
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-8 pt-6 space-y-4">
                    <div className="flex justify-center mb-4">
                        <div className={`p-3 rounded-2xl ${
                            plan.id === "agency" ? "bg-yellow-500/10 text-yellow-500" :
                            plan.id === "pro" ? "bg-blue-500/10 text-blue-500" :
                            "bg-green-500/10 text-green-500"
                        }`}>
                            {plan.id === "agency" && <Crown className="size-8" />}
                            {plan.id === "pro" && <Zap className="size-8" />}
                            {plan.id === "free" && <Building2 className="size-8" />}
                        </div>
                    </div>
                    
                    <div>
                        <CardTitle className="text-2xl font-bold mb-2">{plan.name}</CardTitle>
                        <p className="text-sm text-muted-foreground px-4 h-10 flex items-center justify-center">{plan.description}</p>
                    </div>

                    <div className="flex items-baseline justify-center gap-1">
                        <span className="text-5xl font-bold tracking-tight">{formatPrice(plan.price)}</span>
                        <span className="text-muted-foreground text-lg font-medium">/{plan.period}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-8 flex-1">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3">
                         <div className="bg-background/80 rounded-xl p-3 text-center border border-border/50 shadow-sm">
                            <MessageSquare className="size-4 mx-auto mb-2 text-primary/70" />
                            <div className="font-bold text-lg">{plan.limits.sms_monthly >= 1000 ? `${plan.limits.sms_monthly / 1000}k` : plan.limits.sms_monthly}</div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">SMS / Mo</div>
                         </div>
                         <div className="bg-background/80 rounded-xl p-3 text-center border border-border/50 shadow-sm">
                            <Smartphone className="size-4 mx-auto mb-2 text-primary/70" />
                            <div className="font-bold text-lg">{plan.limits.max_devices === -1 ? "∞" : plan.limits.max_devices}</div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Devices</div>
                         </div>
                    </div>

                    <div className="space-y-4">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pl-1">Everything in the plan</div>
                        {plan.features.map((feature, index) => (
                            <div key={index} className="flex items-start gap-3 group">
                            <div className={`mt-0.5 rounded-full p-0.5 ${isPopular ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground group-hover:text-foreground ease-in-out duration-300"}`}>
                                <Check className="size-3 shrink-0" strokeWidth={3} />
                            </div>
                            <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">{feature}</span>
                            </div>
                        ))}
                    </div>
                  </CardContent>

                  <CardFooter className="pt-4 pb-8">
                     <Button
                      className={`w-full h-12 text-md font-medium transition-all duration-300 ${
                          isPopular 
                          ? "shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02]" 
                          : ""
                      }`}
                      variant={isCurrent ? "secondary" : isPopular ? "default" : "outline"}
                      onClick={() => !isCurrent && plan.stripe_price_id ? handleCheckout(plan.stripe_price_id) : null}
                      disabled={isCurrent || upgrading !== null || (!plan.stripe_price_id && !isFree)} 
                    >
                      {upgrading === plan.stripe_price_id ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : isCurrent ? (
                        <>
                          Current Plan
                        </>
                      ) : !plan.stripe_price_id ? (
                          isFree ? "Current Plan (Free)" : (
                             <span className="flex items-center gap-2">Contact Sales <ArrowRight className="size-4" /></span>
                          )
                      ) : (
                        `Upgrade to ${plan.name}`
                      )}
                    </Button>
                  </CardFooter>
                </Card>
            </motion.div>
          );
        })}
      </motion.div>

   
      {/* Enterprise CTA */}
      <motion.div 
        initial={{ opacity: 0 }} 
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-16 text-center bg-muted/30 rounded-2xl p-8 max-w-3xl mx-auto border border-border/50"
      >
        <h2 className="text-2xl font-bold mb-2">Need a Custom Solution?</h2>
        <p className="text-muted-foreground mb-6">
          For large-scale operations requiring high throughput and dedicated support.
        </p>
        <Button variant="outline" className="px-8">Contact Sales Team</Button>
      </motion.div>
    </div>
  );
}
