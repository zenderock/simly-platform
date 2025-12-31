"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { useAuth } from "@/lib/auth";
import { useApplicationStore } from "@/store/application-store";
import api from "@/lib/api";
import { Application } from "@/types";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { token } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const setApplications = useApplicationStore((state) => state.setApplications);

  useEffect(() => {
    setMounted(true);
    if (!token) {
      router.push("/login");
    } else {
      // Fetch apps once authenticated
      const fetchApps = async () => {
        try {
          const res = await api.get<Application[]>("/applications");
          setApplications(res.data || []);
        } catch (error) {
          console.error("Failed to fetch applications", error);
        }
      };
      fetchApps();
    }
  }, [token, router, setApplications]);

  if (!mounted || !token) {
    return null; // Or a loading spinner
  }
  return (
    <SidebarProvider className="bg-sidebar">
      <DashboardSidebar />
      <div className="h-svh overflow-hidden lg:p-2 w-full">
        <div className="lg:border lg:rounded-md overflow-hidden flex flex-col items-center justify-start bg-container h-full w-full bg-background">
          <DashboardHeader />
          <main className="flex-1 w-full overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
