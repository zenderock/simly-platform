"use client";

import { useEffect, useState } from "react";
import { CreateWebhookDialog } from "@/components/webhooks/create-webhook-dialog";
import { WebhookCard } from "@/components/webhooks/webhook-card";
import { Webhook } from "@/types";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Webhook as WebhookIcon, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import LoaderQuater from "@/components/loader";

export default function WebhooksPage() {
  const { organizationId } = useAuth();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWebhooks = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/webhooks`);
      setWebhooks(response.data || []);
    } catch (error) {
      console.error("Failed to fetch webhooks", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, [organizationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoaderQuater />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <WebhookIcon className="size-8" />
            Webhooks
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Configure webhooks to receive real-time notifications about inbound SMS and message status updates.
          </p>
        </div>
        <CreateWebhookDialog onCreated={fetchWebhooks} />
      </div>

      <div className="grid gap-4">
        {webhooks.length === 0 ? (
          <Alert>
            <ShieldAlert className="size-4" />
            <AlertTitle>No webhooks configured</AlertTitle>
            <AlertDescription>
              You haven&apos;t set up any webhooks yet. Add a destination URL to start receiving events.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             {webhooks.map((webhook) => (
                <WebhookCard 
                  key={webhook.id} 
                  webhook={webhook} 
                  onDelete={fetchWebhooks} 
                />
             ))}
          </div>
        )}
      </div>

      <div className="mt-8 p-4 border rounded-lg bg-muted/20">
        <h3 className="font-semibold mb-2">How to verify signatures?</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Simly signs all webhook events using HMAC-SHA256. The signature is sent in the 
          <code className="mx-1 px-1 bg-muted rounded text-xs select-all">X-Simly-Signature</code> header.
        </p>
        <p className="text-sm text-muted-foreground">
          Use the signing secret from your webhook card to compute the signature of the request body and compare it.
        </p>
      </div>
    </div>
  );
}
