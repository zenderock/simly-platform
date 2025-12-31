"use client";

import { WelcomeSection } from "./welcome-section";
import { StatsCards } from "./stats-cards";
import { LeadSourcesChart as MessageStatusChart } from "./lead-sources-chart";
import { MessageTrafficChart } from "@/components/dashboard/message-traffic-chart";
import { MessagesTable } from "./messages-table";

export function DashboardContent() {
  return (
    <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 space-y-8 bg-background">
      <WelcomeSection />
      
      <StatsCards />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MessageTrafficChart />
        </div>
        <MessageStatusChart />
      </div>

      <MessagesTable />
    </main>
  );
}
