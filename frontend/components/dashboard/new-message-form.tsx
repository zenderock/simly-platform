"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import LoaderQuater from "../loader";
import { IconDeviceMobile, IconSend2 } from "@tabler/icons-react";

interface NewMessageFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  hideTitle?: boolean;
}

export function NewMessageForm({
  onSuccess,
  onCancel,
  hideTitle = false,
}: NewMessageFormProps) {
  const triggerRefresh = useDashboardStore((state) => state.triggerRefresh);
  const activeAppId = useApplicationStore((state) => state.activeAppId);
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

  // Fetch devices on mount
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await api.get<Device[]>("/devices");
        setDevices(res.data || []);
      } catch (error) {
        console.error("Failed to fetch devices", error);
      }
    };
    fetchDevices();
  }, []);

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

      // Determine success message based on context
      let successMessage = "Your message has been queued for delivery.";
      if (formData.scheduled_at) {
        successMessage = "Your message has been scheduled successfully.";
      } else if (formData.device_id !== "auto") {
        successMessage = "Your message has been sent to the device.";
      }

      toast({
        title: "Message Queued",
        description: successMessage,
        variant: "success",
      });

      triggerRefresh();

      setFormData({
        to: "",
        body: "",
        device_id: "auto",
        sim_slot: "auto",
        scheduled_at: "",
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data ||
        error.message ||
        "Failed to send message. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="grid gap-6 p-6 bg-white dark:bg-card">
          <div className="grid gap-2.5">
            <Label
              htmlFor="to"
              className="text-sm font-semibold text-foreground/80"
            >
              Recipient Number
            </Label>
            <PhoneInput
              id="to"
              value={formData.to}
              onValueChange={(val: string) =>
                setFormData({ ...formData, to: val })
              }
              required
              className="h-10 text-base sm:text-sm"
            />
          </div>

          <div className="grid gap-2.5">
            <Label
              htmlFor="device"
              className="text-sm font-semibold text-foreground/80"
            >
              Via Device
            </Label>
            <Select
              value={formData.device_id}
              onValueChange={(val) =>
                setFormData({ ...formData, device_id: val })
              }
            >
              <SelectTrigger className="h-10 w-full bg-background border-input/60 text-base sm:text-sm focus:ring-1 focus:ring-primary/20 focus:border-primary/50 shadow-sm transition-all [&>span]:line-clamp-1">
                <SelectValue placeholder="Select device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  <div className="flex items-center gap-2">
                    <IconDeviceMobile className="size-4 text-emerald-500" />
                    <span className="font-medium">Auto (Best Signal)</span>
                  </div>
                </SelectItem>
                {devices.map((device) => (
                  <SelectItem key={device.id} value={device.id.toString()}>
                    {device.name}{" "}
                    <span className="text-muted-foreground text-xs ml-1">
                      ({device.model})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2.5">
            <Label
              htmlFor="sim_slot"
              className="text-sm font-semibold text-foreground/80"
            >
              SIM Slot (Optional)
            </Label>
            <Select
              value={formData.sim_slot}
              onValueChange={(val) =>
                setFormData({ ...formData, sim_slot: val })
              }
            >
              <SelectTrigger className="h-10 w-full bg-background border-input/60 text-base sm:text-sm focus:ring-1 focus:ring-primary/20 focus:border-primary/50 shadow-sm transition-all [&>span]:line-clamp-1">
                <SelectValue placeholder="Select SIM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-emerald-600">
                      Automatic
                    </span>
                  </div>
                </SelectItem>
                {(() => {
                  const selectedDevice = devices.find(
                    (d) => d.id.toString() === formData.device_id
                  );
                  if (selectedDevice && selectedDevice.sim_cards) {
                    // Filter duplicates based on slot_index
                    const uniqueSims = selectedDevice.sim_cards.filter(
                      (sim, index, self) =>
                        index ===
                        self.findIndex((s) => s.slot_index === sim.slot_index)
                    );

                    return uniqueSims.map((sim, index) => (
                      <SelectItem
                        key={sim.slot_index}
                        value={sim.slot_index.toString()}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            SIM {sim.slot_index + 1}
                          </span>
                          {sim.phone_number && (
                            <span className="text-muted-foreground text-xs">
                              ({sim.phone_number})
                            </span>
                          )}
                          {sim.operator && (
                            <span className="text-muted-foreground text-xs">
                              - {sim.operator}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ));
                  } else {
                    return [
                      <SelectItem key="0" value="0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">SIM 1</span>
                        </div>
                      </SelectItem>,
                      <SelectItem key="1" value="1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">SIM 2</span>
                        </div>
                      </SelectItem>,
                    ];
                  }
                })()}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2.5">
            <Label
              htmlFor="message"
              className="text-sm font-semibold text-foreground/80"
            >
              Message Content
            </Label>
            <div className="relative">
              <Textarea
                id="message"
                placeholder="Type your message here..."
                className="min-h-[140px] resize-none text-base sm:text-sm bg-background border-input/60 focus-visible:bg-background transition-all focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/50 shadow-sm p-3.5"
                value={formData.body}
                onChange={(e) =>
                  setFormData({ ...formData, body: e.target.value })
                }
                required
              />
              <div className="absolute bottom-2.5 right-3 text-[10px] sm:text-xs font-medium text-muted-foreground/60 pointer-events-none bg-background/80 px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                {formData.body.length} chars
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-muted/30 border-t flex flex-row items-center justify-end gap-3 mt-auto">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="mt-0 shadow-sm border-border/60 hover:bg-background hover:text-foreground font-medium"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading}
          className="shadow-md bg-foreground text-background hover:bg-foreground/90 font-bold px-6"
        >
          {loading && <LoaderQuater className="mr-2 size-4 " />}
          {!loading && <IconSend2 className="size-4 mr-2" />}
          Send Message
        </Button>
      </div>
    </form>
  );
}
