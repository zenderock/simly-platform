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
  Cpu
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";

interface DeviceCardProps {
  device: Device;
  onDelete?: (id: number) => void;
}

export function DeviceCard({ device, onDelete }: DeviceCardProps) {
  const isOnline = device.status === "online";
  
  const getBatteryIcon = (level: number) => {
    if (level <= 20) return <BatteryLow className="size-3.5 text-red-500" />;
    if (level <= 60) return <BatteryMedium className="size-3.5 text-orange-500" />;
    return <BatteryFull className="size-3.5 text-emerald-500" />;
  };

  const getSignalStrength = (level: number) => {
    // Level 0-4 assumed
    const bars = Array.from({ length: 4 }).map((_, i) => (
      <div 
        key={i} 
        className={`w-0.5 rounded-full transition-all ${
          i < level 
            ? "bg-[#6e3ff3] opacity-100" 
            : "bg-zinc-200 dark:bg-zinc-800"
        }`} 
        style={{ height: `${(i + 1) * 25}%` }}
      />
    ));
    return <div className="flex items-end gap-0.5 h-3">{bars}</div>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="group border shadow-none hover:border-[#6e3ff3]/30 transition-all duration-300 bg-card overflow-hidden">
        <CardHeader className="p-3 sm:p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`gap-1 px-1.5 py-0 text-[10px] font-medium border-none shadow-none h-5 ${
                  isOnline 
                  ? "bg-emerald-500/10 text-emerald-600" 
                  : "bg-zinc-500/10 text-zinc-500"
                }`}
              >
                <div className={`size-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`} />
                {isOnline ? "Online" : "Offline"}
              </Badge>
              {device.model && (
                <div className="flex items-center text-[10px] text-muted-foreground bg-secondary/50 px-1.5 rounded h-5 font-mono">
                  {device.model}
                </div>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-6 h-6 w-6">
                  <MoreVertical className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem className="gap-2">
                  <Settings className="size-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <History className="size-4" />
                  Logs
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="gap-2 text-red-600 focus:bg-red-50 focus:text-red-600"
                  onClick={() => onDelete?.(device.id)}
                >
                  <Trash2 className="size-4" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-semibold tracking-tight mt-2">
            <Smartphone className={`size-4 ${isOnline ? "text-[#6e3ff3]" : "text-muted-foreground"}`} />
            {device.name}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
          <div className="flex items-center gap-3 border-b pb-3 border-dashed">
            <div className="flex items-center gap-1.5">
              {getBatteryIcon(device.battery_level)}
              <span className="text-xs font-semibold tabular-nums">{device.battery_level}%</span>
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              {getSignalStrength(device.signal_strength)}
              <span className="text-[10px] text-muted-foreground uppercase font-medium">Signal</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="space-y-1.5">
              {device.sim_cards && device.sim_cards.length > 0 ? (
                device.sim_cards.map((sim) => (
                  <div 
                    key={sim.id} 
                    className={`flex items-center justify-between px-2 py-1.5 rounded border text-xs transition-colors ${
                      sim.is_active ? "bg-secondary/20 border-secondary/40" : "bg-zinc-50 border-zinc-100 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold bg-background border px-1 rounded h-4 flex items-center shadow-sm">SIM {sim.slot_index + 1}</span>
                      <div className="flex flex-col leading-none gap-0.5">
                         <span className="font-medium">{sim.operator || "Unknown"}</span>
                         <span className="text-[10px] text-muted-foreground tabular-nums">{sim.phone_number || "No number"}</span>
                      </div>
                    </div>
                    {sim.is_active && (
                      <div className="size-1 bg-emerald-500 rounded-full shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic px-1">No SIM detected</p>
              )}
            </div>
          </div>

          {device.tags && device.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {device.tags.map(tag => (
                <span key={tag} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground font-medium uppercase tracking-tight">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
