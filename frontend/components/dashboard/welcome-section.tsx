"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Download, FileText } from "lucide-react";
import { NewMessageDialog } from "@/components/dashboard/new-message-dialog";
import api from "@/lib/api";
import { DashboardStats } from "@/types";
import { useAuth } from "@/lib/auth";
import { useDashboardStore } from "@/store/dashboard-store";

export function WelcomeSection() {
  const { user } = useAuth();
  const refreshKey = useDashboardStore((state) => state.refreshKey);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get<DashboardStats>("/dashboard/stats");
        setStats(res.data);
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      }
    };
    fetchStats();
  }, [refreshKey]);

  const pending = stats?.pending_messages || 0;
  const activeDevices = stats?.active_devices || 0;
  const totalDevices = stats?.total_devices || 0;
  const allOnline = totalDevices > 0 && activeDevices === totalDevices;

  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
      <div className="space-y-2 sm:space-y-5">
        <h2 className="text-xl sm:text-[24px] font-bold leading-relaxed tracking-tight">
          Welcome back, {user?.name?.split(' ')[0] || "User"}!
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Today you have <span className="text-foreground font-semibold">{pending} messages</span> pending,{" "}
          {totalDevices === 0 ? (
            <span className="text-orange-500 font-semibold italic">no devices connected</span>
          ) : allOnline ? (
            <span className="text-emerald-500 font-semibold italic">all your devices are online</span>
          ) : (
            <span className="text-amber-500 font-semibold italic">{activeDevices}/{totalDevices} devices online</span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 sm:gap-3 h-8 sm:h-9 text-xs sm:text-sm shadow-none border font-medium">
              <span className="hidden xs:inline">Activity Log</span>
              <span className="xs:hidden">
                <Download className="size-4" />
              </span>
              <ChevronDown className="size-3 sm:size-4 text-muted-foreground opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Download className="size-4 mr-2" />
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FileText className="size-4 mr-2" />
              PDF Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <NewMessageDialog />
      </div>
    </div>
  );
}
