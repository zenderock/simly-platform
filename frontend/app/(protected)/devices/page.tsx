"use client";

import { useState } from "react";
import {
  Smartphone,
  Search,
  Filter,
  Terminal,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Device } from "@/types";
import { DeviceCard } from "@/components/devices/device-card";
import { DeviceSettingsDialog } from "@/components/devices/device-settings-dialog";
import { ConnectDeviceDialog } from "@/components/devices/connect-device-dialog";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDevices, useDeleteDevice } from "@/hooks/use-devices";
import { useCurrentOrganization } from "@/hooks/use-organizations";

export default function DevicesPage() {
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "online" | "offline"
  >("all");
  const router = useRouter();

  const { data: devices = [], isLoading, refetch, isFetching } = useDevices();
  const { data: org } = useCurrentOrganization();
  const deleteDevice = useDeleteDevice();

  const filteredDevices = devices.filter((d: Device) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.model || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.sim_cards?.some((s) => s.phone_number?.includes(searchQuery));

    if (!matchesSearch) return false;

    if (statusFilter === "online") return d.status === "online";
    if (statusFilter === "offline") return d.status !== "online";

    return true;
  });

  const activeCount = devices.filter(
    (d: Device) => d.status === "online"
  ).length;
  const limitReached = org ? devices.length >= org.max_devices : false;

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to remove this device?")) {
      try {
        await deleteDevice.mutateAsync(id);
      } catch (e) {
        alert("Failed to delete device");
      }
    }
  };

  const handleEdit = (device: Device) => {
    setEditingDevice(device);
  };

  const handleLogs = (device: Device) => {
    router.push(`/messages?device=${encodeURIComponent(device.name)}`);
  };

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 space-y-8 bg-background">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#8c52ff]">
            <Smartphone className="size-5" />
            <span className="text-sm font-bold uppercase tracking-widest">
              Device Fleet
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Gateways
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-lg">
            Manage your Android phones connected as SMS gateways. Currently
            using{" "}
            <span className="text-foreground font-semibold">
              {activeCount} online
            </span>{" "}
            out of {devices.length} total.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-10 w-10"
          >
            <RefreshCw
              className={`size-4 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
          <ConnectDeviceDialog disabled={limitReached} />
        </div>
      </div>

      {/* Stats / Limit info */}
      {org && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border bg-secondary/20 gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-background rounded-lg border shadow-sm">
              <Terminal className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">
                Current Plan
              </p>
              <p className="text-lg font-bold flex items-center gap-2">
                {org.plan.toUpperCase()}
                <Badge
                  variant="outline"
                  className="text-[10px] h-4 px-1 border-[#8c52ff]/20 text-[#8c52ff]"
                >
                  Active
                </Badge>
              </p>
            </div>
          </div>

          <div className="flex gap-4 sm:gap-8 w-full sm:w-auto">
            <div className="space-y-1 sm:text-right flex-1 sm:flex-none">
              <p className="text-xs text-muted-foreground font-medium tracking-tight">
                Devices Usage
              </p>
              <p className="font-bold tabular-nums">
                {devices.length}{" "}
                <span className="text-muted-foreground font-normal">
                  / {org.max_devices === 100 ? "∞" : org.max_devices}
                </span>
              </p>
            </div>
            <div className="space-y-1 sm:text-right flex-1 sm:flex-none">
              <p className="text-xs text-muted-foreground font-medium tracking-tight">
                SIMs per device
              </p>
              <p className="font-bold">Up to {org.max_sims_per_device}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Warning if limit reached */}
      {limitReached && (
        <div className="flex items-center gap-3 p-3 text-sm bg-orange-50 border border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/30 text-orange-600 rounded-lg">
          <ShieldAlert className="size-4 shrink-0" />
          <p>
            You've reached your device limit of {org?.max_devices}. Upgrade to a
            Pro plan to add more devices.
          </p>
        </div>
      )}

      {/* Filter & List */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, model or number..."
              className="pl-10 h-10 shadow-none border-zinc-200 dark:border-zinc-800 focus-visible:ring-[#8c52ff]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            asChild
            className="h-10 w-10 shrink-0"
          >
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Filter
                  className={`size-4 ${
                    statusFilter !== "all" ? "text-[#8c52ff]" : ""
                  }`}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "all"}
                  onCheckedChange={() => setStatusFilter("all")}
                >
                  All Devices
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "online"}
                  onCheckedChange={() => setStatusFilter("online")}
                >
                  Online Only
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "offline"}
                  onCheckedChange={() => setStatusFilter("offline")}
                >
                  Offline Only
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border shadow-none h-[280px]">
                <div className="p-6 space-y-4">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-5" />
                  </div>
                  <Skeleton className="h-8 w-1/2" />
                  <div className="space-y-2 pt-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredDevices.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredDevices.map((device: Device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onLogs={handleLogs}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center border rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/20 border-dashed">
            <div className="size-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
              <Smartphone className="size-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold">No devices found</h3>
            <p className="text-muted-foreground text-sm max-w-[250px] mt-1">
              Start by connecting an Android phone to send SMS from your local
              SIM cards.
            </p>
            <div className="mt-6">
              <ConnectDeviceDialog disabled={limitReached} />
            </div>
          </div>
        )}
      </div>

      <DeviceSettingsDialog
        device={editingDevice}
        open={!!editingDevice}
        onOpenChange={(open) => !open && setEditingDevice(null)}
      />
    </div>
  );
}
