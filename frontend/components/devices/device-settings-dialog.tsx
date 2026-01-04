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
  const updateDevice = useUpdateDevice();

  useEffect(() => {
    if (device) {
      setName(device.name);
    }
  }, [device]);

  const handleUpdateName = async () => {
    if (!device) return;
    try {
      await updateDevice.mutateAsync({
        id: device.id,
        data: {
          name,
          tags: device.tags || [],
        },
      });
      toast.success("Device name updated");
    } catch (e) {
      console.error("Failed to update device name:", e);
    }
  };

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
