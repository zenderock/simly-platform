"use client";

import { MessageSquare, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import React from "react";
import { useApplicationStore } from "@/store/application-store";
import { NewMessageDialog } from "@/components/dashboard/new-message-dialog";
import { MessagesTable } from "@/components/dashboard/messages-table";
import { motion } from "framer-motion";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";

export function MessagesContent() {
  const activeAppId = useApplicationStore((state) => state.activeAppId);
  const { data: stats, isLoading: loading } = useDashboardStats(activeAppId);

  const delivered = stats?.delivered_messages || 0;
  const failed = stats?.failed_messages || 0;
  const finalized = delivered + failed;
  const successRate = finalized > 0 ? (delivered / finalized) * 100 : 100;

  const cards = [
    {
      label: "Total Sent",
      value: stats?.total_messages || 0,
      icon: MessageSquare,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Success Rate",
      value: `${successRate.toFixed(1)}%`,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
       label: "In Queue",
       value: stats?.pending_messages || 0,
       icon: Clock,
       color: "text-amber-500",
       bg: "bg-amber-500/10",
    },
    {
       label: "Failed",
       value: stats?.failed_messages || 0,
       icon: AlertCircle,
       color: "text-red-500",
       bg: "bg-red-500/10",
    }
  ];

  return (
    <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 space-y-8 bg-background">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Messages</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Track and manage your SMS traffic in real-time.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <NewMessageDialog />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-4 sm:p-6 rounded-xl border bg-card shadow-none space-y-3"
          >
            <div className={`size-10 ${card.bg} rounded-lg flex items-center justify-center`}>
              <card.icon className={`size-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">{card.label}</p>
              <p className="text-xl sm:text-2xl font-bold tracking-tight">
                {loading ? "..." : card.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Table */}
      <MessagesTable />
    </main>
  );
}
