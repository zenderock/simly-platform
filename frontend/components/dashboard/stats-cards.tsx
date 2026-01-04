"use client";

import React from "react";
import { useApplicationStore } from "@/store/application-store";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import {
  IconMessageUser,
  IconSquareRoundedCheck,
  IconDeviceMobile,
  IconCreditCard,
  IconListTree,
} from "@tabler/icons-react";

export function StatsCards() {
  const activeAppId = useApplicationStore((state) => state.activeAppId);
  const { data: stats, isLoading: loading } = useDashboardStats(activeAppId);

  const totalMessages = stats?.total_messages || 0;
  const delivered = stats?.delivered_messages || 0;
  const failed = stats?.failed_messages || 0;
  const activeDevices = stats?.active_devices || 0;
  const totalDevices = stats?.total_devices || 0;
  const queue = stats?.pending_messages || 0;

  // Success Rate based on finalized messages (delivered vs failed)
  const finalized = delivered + failed;
  const successRate = finalized > 0 ? (delivered / finalized) * 100 : 100;

  const statsData = [
    {
      title: "Sent Messages",
      value: totalMessages.toLocaleString(),
      change: "+0%", // Dynamic trend calculation would go here
      changeValue: "",
      isPositive: true,
      icon: IconMessageUser,
    },
    {
      title: "Success Rate",
      value: `${successRate.toFixed(1)}%`,
      change: "stable",
      changeValue: "",
      isPositive: successRate >= 98,
      icon: IconSquareRoundedCheck,
    },
    {
      title: "Active Devices",
      value: `${activeDevices}`,
      change: `${totalDevices} total`,
      changeValue: "",
      isPositive: activeDevices > 0,
      icon: IconDeviceMobile,
    },
    {
      title: "Current Bill",
      value: `$${(stats?.current_month_cost || 0).toFixed(2)}`,
      change: "estimated",
      changeValue: "",
      isPositive: true,
      icon: IconCreditCard,
    },
    {
      title: "Message Queue",
      value: queue.toLocaleString(),
      change: "pending",
      changeValue: "",
      isPositive: true,
      icon: IconListTree,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 p-3 sm:p-4 lg:p-6 rounded-xl border bg-card">
      {statsData.map((stat, index) => (
        <div key={stat.title} className="flex items-start">
          <div className="flex-1 space-y-2 sm:space-y-4 lg:space-y-6">
            <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
              <stat.icon className="size-3.5 sm:size-[18px]" />
              <span className="text-[10px] sm:text-xs lg:text-sm font-medium truncate">
                {stat.title}
              </span>
            </div>
            <p className="text-lg sm:text-xl lg:text-[28px] font-semibold leading-tight tracking-tight">
              {loading ? "..." : stat.value}
            </p>
            <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-[10px] sm:text-xs lg:text-sm font-medium">
              <span
                className={
                  stat.isPositive ? "text-emerald-600" : "text-red-600"
                }
              >
                {stat.change}
                <span className="hidden sm:inline">{stat.changeValue}</span>
              </span>
              <span className="text-muted-foreground hidden sm:inline">
                vs Last Month
              </span>
            </div>
          </div>
          {index < statsData.length - 1 && (
            <div className="hidden lg:block w-px h-full bg-border mx-4 xl:mx-6" />
          )}
        </div>
      ))}
    </div>
  );
}
