"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Webhook as WebhookIcon, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import api from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import LoaderQuater from "../loader";

interface CreateWebhookDialogProps {
  onCreated: () => void;
}

const EVENT_TYPES = [
  {
    id: "message.sent",
    label: "Message Sent",
    description: "Triggered when a message is successfully sent from the device."
  },
  {
    id: "message.delivered",
    label: "Message Delivered",
    description: "Triggered when a message delivery is confirmed."
  },
  {
    id: "message.failed",
    label: "Message Failed",
    description: "Triggered when a message fails to send or deliver."
  },
  {
    id: "message.received",
    label: "Message Received",
    description: "Triggered when an inbound SMS is received by the device."
  }
];

export function CreateWebhookDialog({ onCreated }: CreateWebhookDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [events, setEvents] = useState<Record<string, boolean>>({
    "message.sent": false,
    "message.delivered": false,
    "message.failed": false,
    "message.received": true
  });

  const validateUrl = (value: string): boolean => {
    if (!value) {
      setUrlError("URL is required");
      return false;
    }
    
    try {
      const urlObj = new URL(value);
      if (urlObj.protocol !== "https:") {
        setUrlError("URL must use HTTPS protocol for security");
        return false;
      }
      setUrlError(null);
      return true;
    } catch {
      setUrlError("Please enter a valid URL");
      return false;
    }
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (value) {
      validateUrl(value);
    } else {
      setUrlError(null);
    }
  };

  const handleEventToggle = (eventId: string, checked: boolean) => {
    setEvents(prev => ({ ...prev, [eventId]: checked }));
  };

  const hasSelectedEvents = Object.values(events).some(v => v);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateUrl(url)) {
      return;
    }

    if (!hasSelectedEvents) {
      toast({
        title: "Select Events",
        description: "Please select at least one event type to subscribe to.",
        variant: "warning",
      });
      return;
    }

    setLoading(true);

    const selectedEvents = Object.entries(events)
      .filter(([_, checked]) => checked)
      .map(([key]) => key)
      .join(",");

    try {
      await api.post("/webhooks", {
        url,
        event_types: selectedEvents
      });
      toast({
        title: "Webhook Created",
        description: "Your webhook has been successfully registered.",
        variant: "success",
      });
      onCreated();
      setOpen(false);
      setUrl("");
      setUrlError(null);
      // Reset defaults
      setEvents({
        "message.sent": false,
        "message.delivered": false,
        "message.failed": false,
        "message.received": true
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create webhook.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-lg font-bold">
          <Plus className="size-4" />
          Add Webhook
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Webhook</DialogTitle>
            <DialogDescription>
              Receive real-time updates for message events via HTTP POST requests.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid gap-2">
              <Label htmlFor="url" className="font-bold text-xs uppercase text-muted-foreground tracking-widest">
                Payload URL
              </Label>
              <Input
                id="url"
                placeholder="https://api.yoursite.com/webhooks/simly"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                required
                className={`h-10 ${urlError ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {urlError && (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="size-3" />
                  {urlError}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Must be a valid HTTPS URL. We&apos;ll send POST requests with JSON payloads.
              </p>
            </div>

            <div className="space-y-3">
              <Label className="font-bold text-xs uppercase text-muted-foreground tracking-widest">
                Event Subscriptions
              </Label>
              <div className="grid gap-2">
                {EVENT_TYPES.map((event) => (
                  <div 
                    key={event.id}
                    className="flex items-start space-x-3 border p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox 
                      id={event.id} 
                      checked={events[event.id]}
                      onCheckedChange={(c) => handleEventToggle(event.id, !!c)}
                      className="mt-0.5"
                    />
                    <div className="grid gap-1 leading-none">
                      <label
                        htmlFor={event.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {event.label}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {event.description}
                      </p>
                      <code className="text-[10px] text-muted-foreground font-mono bg-muted px-1 py-0.5 rounded w-fit">
                        {event.id}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
              {!hasSelectedEvents && (
                <p className="text-xs text-amber-600">
                  Select at least one event type to receive notifications.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              className="w-full font-bold h-11" 
              disabled={loading || !hasSelectedEvents || !!urlError}
            >
              {loading ? <LoaderQuater className="mr-2 size-4" /> : <WebhookIcon className="mr-2 size-4" />}
              Register Webhook
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
