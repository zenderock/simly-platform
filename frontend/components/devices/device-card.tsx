"use client";

import { Device } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Smartphone,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Signal,
  Wifi,
  MoreVertical,
  Settings,
  History,
  Trash2,
  Cpu,
  ShieldAlert,
  Clock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";

interface DeviceCardProps {
  device: Device;
  onDelete?: (id: number) => void;
  onEdit?: (device: Device) => void;
  onLogs?: (device: Device) => void;
}

export function DeviceCard({
  device,
  onDelete,
  onEdit,
  onLogs,
}: DeviceCardProps) {
  const isOnline = device.status === "online";

  const getBatteryIcon = (level: number) => {
    if (level <= 20) return <BatteryLow className="size-3.5 text-red-500" />;
    if (level <= 60)
      return <BatteryMedium className="size-3.5 text-orange-500" />;
    return <BatteryFull className="size-3.5 text-emerald-500" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div className="group relative flex flex-col rounded-xl border bg-white dark:bg-zinc-900 transition-all hover:border-zinc-300 dark:hover:border-zinc-700 overflow-hidden">
        <div className="p-4 flex flex-col gap-4">
          {/* Header: Name, Model, Menu */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 leading-tight">
                  {device.name}
                </h3>
                {isOnline && !device.requires_setup && (
                  <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                )}
                {device.requires_setup && (
                  <Badge
                    variant="destructive"
                    className="text-[10px] uppercase tracking-wider h-4 px-1.5 animate-pulse"
                  >
                    Setup Required
                  </Badge>
                )}
              </div>
              <div className="flex flex-col gap-0.5 mt-1">
                <p className="text-xs font-mono text-zinc-500 tracking-tight">
                  {device.model || "Unknown Model"}
                </p>
                {device.last_seen_at && (
                  <p className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
                    <Clock className="size-3" />
                    {isOnline
                      ? "Currently Connected"
                      : `Last seen: ${new Date(device.last_seen_at).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}`
                    }
                  </p>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 -mr-2 -mt-2 text-zinc-400 hover:text-zinc-600"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onEdit?.(device)}
                  className="gap-2 cursor-pointer"
                >
                  <Settings className="size-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onLogs?.(device)}
                  className="gap-2 cursor-pointer"
                >
                  <History className="size-4" /> Logs
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete?.(device.id)}
                  className="text-red-600 gap-2 cursor-pointer"
                >
                  <Trash2 className="size-4" /> Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Battery */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
              <div
                className={`p-1.5 rounded-full ${device.battery_level < 20
                  ? "bg-red-100 text-red-600"
                  : "bg-emerald-100 text-emerald-600"
                  } dark:bg-opacity-10`}
              >
                {getBatteryIcon(device.battery_level)}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold">
                  Battery
                </span>
                <span className="text-xs font-bold font-mono">
                  {device.battery_level}%
                </span>
              </div>
            </div>

            {/* Signal */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
              <div className="p-1.5 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Signal className="size-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold">
                  Signal
                </span>
                <div className="flex items-end gap-0.5 h-3 w-8">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 rounded-sm ${i < device.signal_strength
                        ? "bg-indigo-500"
                        : "bg-zinc-200 dark:bg-zinc-700"
                        }`}
                      style={{ height: `${(i + 1) * 25}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Setup Warning */}
          {device.requires_setup && (
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <ShieldAlert className="size-4" />
                <span className="text-xs font-bold uppercase tracking-tight">
                  Configuration Needed
                </span>
              </div>
              <p className="text-[11px] text-red-600/80 dark:text-red-400/80 leading-snug">
                This device is linked but unusable. You must configure SIM
                prefixes before sending messages.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-[10px] w-full mt-1 bg-red-600 hover:bg-red-700"
                onClick={() => onEdit?.(device)}
              >
                Configure Now
              </Button>
            </div>
          )}

          {/* SIM Cards List */}
          <div className="space-y-2">
            {(() => {
              // Filter duplicates: Keep the one with phone number if duplicates exist for same slot
              const uniqueSims = Object.values(
                (device.sim_cards || []).reduce((acc, sim) => {
                  if (
                    !acc[sim.slot_index] ||
                    (!acc[sim.slot_index].phone_number && sim.phone_number)
                  ) {
                    acc[sim.slot_index] = sim;
                  }
                  return acc;
                }, {} as Record<number, (typeof device.sim_cards)[0]>)
              ).sort((a, b) => a.slot_index - b.slot_index);

              if (uniqueSims.length === 0) {
                return (
                  <div className="flex items-center gap-2 text-zinc-400 text-xs p-2 border border-dashed rounded bg-zinc-50/50 dark:bg-zinc-900/50 dark:border-zinc-800">
                    <ShieldAlert className="size-3.5" />
                    <span>No SIM cards detected</span>
                  </div>
                );
              }

              return uniqueSims.map((sim) => (
                <div
                  key={sim.id}
                  className="group/sim flex items-center justify-between text-xs p-2 rounded border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-6 rounded flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 font-bold text-[10px] text-zinc-500 border dark:border-zinc-700">
                      {sim.slot_index + 1}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                        {sim.operator || "Unknown"}
                      </span>
                      <span className="text-zinc-400 font-mono tracking-tight">
                        {sim.phone_number || "No number"}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${sim.is_active
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                      : "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                      }`}
                  >
                    {sim.is_active ? "Active" : "Idle"}
                  </div>
                </div>
              ));
            })()}
          </div>

          {/* Footer / Tags */}
          {device.tags && device.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1 border-t border-dashed mt-1">
              {device.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 px-1"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
