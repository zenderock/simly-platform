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
import { IconSparkles } from "@tabler/icons-react";
import { generatePrefixes } from "@/lib/api/ai";
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
  const [simPrefixes, setSimPrefixes] = useState<Record<number, string>>({});
  const [generatingSlots, setGeneratingSlots] = useState<
    Record<number, boolean>
  >({});
  const updateDevice = useUpdateDevice();

  const handleSmartGenerate = async (slotIndex: number, operator?: string) => {
    const prompt = window.prompt(
      `Enter the Country and Carrier for SIM ${
        slotIndex + 1
      } (e.g., "Cameroon Orange", "France Free Mobile")`,
      operator || ""
    );

    if (!prompt) return;

    setGeneratingSlots((prev) => ({ ...prev, [slotIndex]: true }));
    try {
      const res = await generatePrefixes(prompt);
      setSimPrefixes((prev) => ({
        ...prev,
        [slotIndex]: res.prefixes,
      }));
      toast.success(`Prefixes generated for ${prompt}`);
    } catch (err) {
      toast.error("Failed to generate prefixes");
      console.error(err);
    } finally {
      setGeneratingSlots((prev) => ({ ...prev, [slotIndex]: false }));
    }
  };
  useEffect(() => {
    if (device) {
      setName(device.name);

      const prefixes: Record<number, string> = {};
      device.sim_cards?.forEach((sim) => {
        prefixes[sim.slot_index] = sim.supported_prefixes || "";
      });
      setSimPrefixes(prefixes);
    }
  }, [device]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!device) return;

    try {
      const simConfigs = Object.entries(simPrefixes).map(([slot, prefix]) => ({
        slot_index: parseInt(slot),
        supported_prefixes: prefix,
      }));

      await updateDevice.mutateAsync({
        id: device.id,
        data: {
          name,
          tags: device.tags || [],
          sim_configs: simConfigs,
        },
      });
      onOpenChange(false);
    } catch (e) {
      console.error("Failed to update device:", e);
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

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Device Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Office Gateway 1"
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Smart Dispatch Rules</Label>
              <Badge variant="outline" className="text-[10px] font-normal">
                Global Routing
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Define which destination prefixes (comma separated) each SIM
              should handle. E.g. for Cameroon: SIM 1 handles "69, 65", SIM 2
              handles "67, 68".
            </p>

            <div className="space-y-3">
              {device.sim_cards?.map((sim) => (
                <div
                  key={sim.slot_index}
                  className="p-3 bg-muted/50 rounded-md border text-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        SIM {sim.slot_index + 1}
                      </Badge>
                      <span className="font-medium">
                        {sim.operator || "Unknown Carrier"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {sim.phone_number || "No number"}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor={`sim-${sim.slot_index}`}
                        className="text-xs font-normal text-muted-foreground"
                      >
                        Target Prefixes (e.g. +23769, 06, 07)
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] gap-1 text-[#8c52ff] hover:text-[#8c52ff] hover:bg-[#8c52ff]/10"
                        onClick={() =>
                          handleSmartGenerate(sim.slot_index, sim.operator)
                        }
                        disabled={generatingSlots[sim.slot_index]}
                      >
                        {generatingSlots[sim.slot_index] ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <IconSparkles className="size-3" />
                        )}
                        Smart Generate
                      </Button>
                    </div>
                    <Input
                      id={`sim-${sim.slot_index}`}
                      value={simPrefixes[sim.slot_index] || ""}
                      onChange={(e) =>
                        setSimPrefixes({
                          ...simPrefixes,
                          [sim.slot_index]: e.target.value,
                        })
                      }
                      placeholder="Enter prefixes (comma separated)..."
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                </div>
              ))}
              {(!device.sim_cards || device.sim_cards.length === 0) && (
                <div className="text-xs text-muted-foreground italic">
                  No SIM cards detected on this device.
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateDevice.isPending}>
              {updateDevice.isPending && (
                <LoaderQuater className="mr-2 size-4" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
