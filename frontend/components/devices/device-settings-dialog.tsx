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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    const frame = requestAnimationFrame(() => {
      setName(device?.name ?? "");
    });

    return () => cancelAnimationFrame(frame);
  }, [device]);

  const handleUpdateSettings = async () => {
    if (!device) return;
    try {
      await updateDevice.mutateAsync({
        id: device.id,
        data: {
          name,
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Device Settings</DialogTitle>
          <DialogDescription>
            Update the settings for {device.model}.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="sims">SIM Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 py-2">
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <div className="space-y-4">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="name" className="text-sm font-bold">
                      Device Name
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      A friendly name to identify this device in your dashboard.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Office Gateway 1"
                      className="bg-white dark:bg-zinc-950"
                    />
                    <Button
                      onClick={handleUpdateSettings}
                      disabled={updateDevice.isPending || name === device.name}
                      className="shrink-0"
                    >
                      {updateDevice.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sims" className="space-y-4 py-2">
            <SimPrefixConfig
              device={device}
              onSuccess={() => onOpenChange(false)}
              onCancel={() => onOpenChange(false)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
