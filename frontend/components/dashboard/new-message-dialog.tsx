"use client";

import { useState, useEffect } from "react";
import { Plus, Send, Smartphone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import { Device } from "@/types";
import { useToast } from "@/components/ui/use-toast";
import { useDashboardStore } from "@/store/dashboard-store";
import { PhoneInput } from "@/components/ui/phone-input";

import { useApplicationStore } from "@/store/application-store";

export function NewMessageDialog() {
  const triggerRefresh = useDashboardStore((state) => state.triggerRefresh);
  const activeAppId = useApplicationStore((state) => state.activeAppId);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    to: "",
    body: "",
    device_id: "auto",
    sim_slot: "auto",
    scheduled_at: "",
  });

  // Fetch devices when dialog opens
  useEffect(() => {
    if (open) {
      const fetchDevices = async () => {
        try {
          const res = await api.get<Device[]>("/devices");
          setDevices(res.data || []);
        } catch (error) {
          console.error("Failed to fetch devices", error);
        }
      };
      fetchDevices();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = {
        to: formData.to,
        body: formData.body,
        application_id: activeAppId,
      };

      if (formData.device_id !== "auto") {
        payload.device_id = parseInt(formData.device_id);
      }

      if (formData.sim_slot !== "auto") {
        payload.sim_slot = parseInt(formData.sim_slot);
      }

      if (formData.scheduled_at) {
        payload.scheduled_at = new Date(formData.scheduled_at).toISOString();
      }

      await api.post("/messages/send", payload);

      toast({
        title: "Message Sent",
        description: "Your message has been queued for delivery.",
        variant: "success",
      });

      triggerRefresh();
      setOpen(false);
      setFormData({ to: "", body: "", device_id: "auto", sim_slot: "auto", scheduled_at: "" });
      
      // Optional: Refresh messages table here? 
      // We might need a global refresh trigger or just let SWR/Polling handle it later.
    } catch (error) {
       toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 sm:gap-3 h-8 sm:h-9 text-xs sm:text-sm bg-foreground text-background shadow-none font-bold">
          <Plus className="size-3 sm:size-4" />
          <span className="hidden xs:inline">New Message</span>
          <span className="xs:hidden">New</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden border-border/40 shadow-xl">
        <DialogHeader className="p-6 bg-muted/30 border-b">
          <DialogTitle className="text-xl font-bold tracking-tight">Send New Message</DialogTitle>
          <DialogDescription className="text-muted-foreground/80 mt-1.5">
            Send a text message via your connected Android devices.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 p-6 bg-white dark:bg-card">
            <div className="grid gap-2.5">
              <Label htmlFor="to" className="text-sm font-semibold text-foreground/80">Recipient Number</Label>
              <PhoneInput
                id="to"
                value={formData.to}
                onValueChange={(val: string) => setFormData({ ...formData, to: val })}
                required
                className="h-10 text-base sm:text-sm"
              />
            </div>
            
            <div className="grid gap-2.5">
              <Label htmlFor="device" className="text-sm font-semibold text-foreground/80">Via Device</Label>
              <Select
                value={formData.device_id}
                onValueChange={(val) => setFormData({ ...formData, device_id: val })}
              >
                <SelectTrigger className="h-10 w-full bg-background border-input/60 text-base sm:text-sm focus:ring-1 focus:ring-primary/20 focus:border-primary/50 shadow-sm transition-all [&>span]:line-clamp-1">
                  <SelectValue placeholder="Select device" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    <div className="flex items-center gap-2">
                      <Smartphone className="size-4 text-emerald-500" />
                      <span className="font-medium">Auto (Best Signal)</span>
                    </div>
                  </SelectItem>
                  {devices.map((device) => (
                    <SelectItem key={device.id} value={device.id.toString()}>
                      {device.name} <span className="text-muted-foreground text-xs ml-1">({device.model})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2.5">
              <Label htmlFor="sim_slot" className="text-sm font-semibold text-foreground/80">SIM Slot (Optional)</Label>
              <Select
                value={formData.sim_slot}
                onValueChange={(val) => setFormData({ ...formData, sim_slot: val })}
              >
                <SelectTrigger className="h-10 w-full bg-background border-input/60 text-base sm:text-sm focus:ring-1 focus:ring-primary/20 focus:border-primary/50 shadow-sm transition-all [&>span]:line-clamp-1">
                  <SelectValue placeholder="Select SIM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    <div className="flex items-center gap-2">
                       <span className="font-medium text-emerald-600">Automatic</span>
                    </div>
                  </SelectItem>
                   <SelectItem value="0">
                    <div className="flex items-center gap-2">
                       <span className="font-medium">SIM 1</span>
                    </div>
                  </SelectItem>
                   <SelectItem value="1">
                    <div className="flex items-center gap-2">
                       <span className="font-medium">SIM 2</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2.5">
              <Label htmlFor="message" className="text-sm font-semibold text-foreground/80">Message Content</Label>
              <div className="relative">
                <Textarea
                  id="message"
                  placeholder="Type your message here..."
                  className="min-h-[140px] resize-none text-base sm:text-sm bg-background border-input/60 focus-visible:bg-background transition-all focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/50 shadow-sm p-3.5"
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  required
                />
                <div className="absolute bottom-2.5 right-3 text-[10px] sm:text-xs font-medium text-muted-foreground/60 pointer-events-none bg-background/80 px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                  {formData.body.length} chars
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-muted/30 border-t flex flex-row items-center justify-end gap-3">
             <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                className="mt-0 shadow-sm border-border/60 hover:bg-background hover:text-foreground font-medium"
              >
                Cancel
              </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className="shadow-md bg-foreground text-background hover:bg-foreground/90 font-bold px-6"
            >
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {!loading && <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-device-mobile-share size-4 mr-2"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 21h-4a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8" /><path d="M11 4h2" /><path d="M16 22l5 -5" /><path d="M21 21.5v-4.5h-4.5" /><path d="M12 17v.01" /></svg>}
              Send Message
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
