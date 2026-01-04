"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Device, SimCard } from "@/types";
import { useUpdateDevice } from "@/hooks/use-devices";
import { Loader2 } from "lucide-react";
import LoaderQuater from "../loader";
import { IconSparkles } from "@tabler/icons-react";
import { generatePrefixes } from "@/lib/api/ai";
import { toast } from "sonner";

interface SimPrefixConfigProps {
  device: Device;
  onSuccess?: () => void;
  onCancel?: () => void;
  isOnboarding?: boolean;
}

export function SimPrefixConfig({
  device,
  onSuccess,
  onCancel,
  isOnboarding = false,
}: SimPrefixConfigProps) {
  const [simPrefixes, setSimPrefixes] = useState<Record<number, string>>({});
  const [dailyLimits, setDailyLimits] = useState<Record<number, number>>({});
  const [generatingSlots, setGeneratingSlots] = useState<
    Record<number, boolean>
  >({});
  const updateDevice = useUpdateDevice();

  useEffect(() => {
    if (device) {
      const prefixes: Record<number, string> = {};
      const limits: Record<number, number> = {};
      device.sim_cards?.forEach((sim) => {
        prefixes[sim.slot_index] = sim.supported_prefixes || "";
        limits[sim.slot_index] = sim.daily_limit ?? 150;
      });
      setSimPrefixes(prefixes);
      setDailyLimits(limits);
    }
  }, [device]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const simConfigs = Object.entries(simPrefixes).map(([slot, prefix]) => ({
        slot_index: parseInt(slot),
        supported_prefixes: prefix,
        daily_limit: dailyLimits[parseInt(slot)] || 150,
      }));

      await updateDevice.mutateAsync({
        id: device.id,
        data: {
          name: device.name,
          tags: device.tags || [],
          sim_configs: simConfigs,
        },
      });

      if (onSuccess) onSuccess();
    } catch (e) {
      console.error("Failed to update device prefixes:", e);
      toast.error("Failed to save configuration");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-bold">Smart Dispatch Rules</Label>
          <Badge
            variant="outline"
            className="text-[10px] uppercase font-bold tracking-wider"
          >
            Global Routing
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Define which destination prefixes each SIM should handle. This ensures
          messages are routed through the cheapest or most appropriate carrier.
        </p>

        <div className="space-y-4">
          {device.sim_cards?.map((sim) => (
            <div
              key={sim.slot_index}
              className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800 transition-all hover:border-zinc-200 dark:hover:border-zinc-700"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg flex items-center justify-center bg-white dark:bg-zinc-800 font-bold text-xs text-zinc-500 border dark:border-zinc-700">
                    {sim.slot_index + 1}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      {sim.operator || "Unknown Carrier"}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {sim.phone_number || "No number detected"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Sent Today
                  </span>
                  <span className="font-mono text-xs font-bold">
                    {sim.sent_today || 0} / {sim.daily_limit || 150}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor={`sim-${sim.slot_index}`}
                    className="text-[11px] font-bold uppercase tracking-tight text-zinc-500"
                  >
                    Target Prefixes (e.g. +23769, 06, 07)
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-[11px] font-bold gap-1.5 text-[#8c52ff] hover:text-[#8c52ff] hover:bg-[#8c52ff]/10 rounded-lg transition-all"
                    onClick={() =>
                      handleSmartGenerate(sim.slot_index, sim.operator)
                    }
                    disabled={generatingSlots[sim.slot_index]}
                  >
                    {generatingSlots[sim.slot_index] ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <IconSparkles className="size-3.5" />
                    )}
                    Smart Generate
                  </Button>
                </div>
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-8">
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
                      className="h-10 text-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <div className="col-span-4 relative">
                    <Input
                      type="number"
                      value={dailyLimits[sim.slot_index] || ""}
                      onChange={(e) =>
                        setDailyLimits({
                          ...dailyLimits,
                          [sim.slot_index]: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="Limit"
                      className="h-10 text-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-primary/20"
                    />
                    <div className="absolute right-3 top-2.5 text-[10px] font-bold text-zinc-400 pointer-events-none">
                      SMS/Day
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {(!device.sim_cards || device.sim_cards.length === 0) && (
            <div className="p-8 text-center border border-dashed rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50">
              <p className="text-sm text-muted-foreground italic">
                No SIM cards detected on this device.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-dashed">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="font-bold text-sm"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={updateDevice.isPending}
          className={`font-bold px-8 shadow-lg shadow-primary/20 ${
            isOnboarding ? "h-12 rounded-full text-base" : "h-10 rounded-lg"
          }`}
        >
          {updateDevice.isPending ? (
            <LoaderQuater className="mr-2 size-4" />
          ) : isOnboarding ? (
            "Complete Configuration"
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}
