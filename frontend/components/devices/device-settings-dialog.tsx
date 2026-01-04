"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Device } from "@/types";
import { useUpdateDevice } from "@/hooks/use-devices";
import { Loader2 } from "lucide-react";
import LoaderQuater from "../loader";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SimPrefixConfig } from "./sim-prefix-config";
import { toast } from "sonner";

interface DeviceSettingsDialogProps {
  device: Device | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeviceSettingsDialog({
  device,
  open,
  onOpenChange,
}: DeviceSettingsDialogProps) {
  const [name, setName] = useState("");
  const [dailyLimit, setDailyLimit] = useState(150);
  const updateDevice = useUpdateDevice();

  useEffect(() => {
    if (device) {
      setName(device.name);
      setDailyLimit(device.daily_limit ?? 150);
    }
  }, [device]);

  const handleUpdateSettings = async () => {
    if (!device) return;
    try {
      await updateDevice.mutateAsync({
        id: device.id,
        data: {
          name,
          daily_limit: dailyLimit,
          tags: device.tags || [],
        },
      });
      toast.success("Device settings updated");
    } catch (e) {
      console.error("Failed to update device settings:", e);
      toast.error("Failed to update settings");
    }
  };

  // Deprecated: use handleUpdateSettings
  const handleUpdateName = handleUpdateSettings;

  if (!device) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Device Settings</DialogTitle>
          <DialogDescription>
            Update the settings for {device.model}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="name">Device Name</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleUpdateName}
                disabled={updateDevice.isPending || name === device.name}
              >
                Update Name
              </Button>
            </div>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Office Gateway 1"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="dailyLimit">Daily SMS Limit</Label>
              <span className="text-xs text-muted-foreground">
                Sent Today: {device.sent_today || 0}
              </span>
            </div>
            <p className="text-[0.8rem] text-muted-foreground">
              Maximum number of SMS this device can send per day to avoid SIM
              blocking.
            </p>
            <div className="flex gap-2">
              <Input
                id="dailyLimit"
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(parseInt(e.target.value) || 0)}
                placeholder="150"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleUpdateSettings}
                disabled={
                  updateDevice.isPending ||
                  dailyLimit === (device.daily_limit || 150)
                }
              >
                <Loader2
                  className={`h-4 w-4 ${
                    updateDevice.isPending ? "animate-spin" : "opacity-0"
                  }`}
                />
                {!updateDevice.isPending && (
                  <span className="sr-only">Save</span>
                )}
                {!updateDevice.isPending && "💾"}
              </Button>
            </div>
          </div>

          <Separator />

          <SimPrefixConfig
            device={device}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
