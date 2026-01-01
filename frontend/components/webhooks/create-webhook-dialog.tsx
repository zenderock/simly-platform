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
import { Plus, Webhook as WebhookIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import api from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

interface CreateWebhookDialogProps {
  onCreated: () => void;
}

export function CreateWebhookDialog({ onCreated }: CreateWebhookDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [url, setUrl] = useState("");
  const [events, setEvents] = useState({
    "sms.received": true,
    "sms.sent": false,
    "sms.delivery_report": false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      });
      onCreated();
      setOpen(false);
      setUrl("");
      // Reset defaults
      setEvents({
        "sms.received": true,
        "sms.sent": false,
        "sms.delivery_report": false
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
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Webhook</DialogTitle>
            <DialogDescription>
              Receive real-time updates for SMS events.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid gap-2">
              <Label htmlFor="url" className="font-bold text-xs uppercase text-muted-foreground tracking-widest">Payload URL</Label>
              <Input
                id="url"
                placeholder="https://api.yoursite.com/webhooks/sms"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                type="url"
                className="h-10"
              />
            </div>

            <div className="space-y-3">
              <Label className="font-bold text-xs uppercase text-muted-foreground tracking-widest">Event Subscriptions</Label>
              <div className="grid gap-2">
                <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox 
                    id="sms.received" 
                    checked={events["sms.received"]}
                    onCheckedChange={(c) => setEvents({...events, "sms.received": !!c})}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="sms.received"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Inbound SMS
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Triggered when a new message is received by the device.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox 
                    id="sms.sent" 
                    checked={events["sms.sent"]}
                    onCheckedChange={(c) => setEvents({...events, "sms.sent": !!c})}
                  />
                  <label
                    htmlFor="sms.sent"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Outbound SMS (Sent)
                  </label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full font-bold h-11" disabled={loading}>
              {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <WebhookIcon className="mr-2 size-4" />}
              Register Webhook
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
