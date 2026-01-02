
import type { Metadata } from "next";
import { DashboardContent } from "@/components/dashboard/content"

export const metadata: Metadata = {
  title: "Dashboard - Simly",
  description: "Monitor your SMS campaigns, device status, and messaging analytics in real-time.",
};

export default function DashboardPage() {
  return <DashboardContent />
}
