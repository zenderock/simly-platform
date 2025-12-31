"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { useAuth } from "@/lib/auth";
import { useApplicationStore } from "@/store/application-store";
import api from "@/lib/api";
import axios from "axios";
import { Application } from "@/types";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { token } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const setApplications = useApplicationStore((state) => state.setApplications);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const timer = setTimeout(() => {
      if (!token) {
        router.push("/login");
      } else {
        const fetchApps = async () => {
          try {
            const res = await api.get<Application[]>("/applications");
            setApplications(res.data || []);
          } catch (error) {
            console.error("Failed to fetch applications", error);
            if (axios.isAxiosError(error) && error.response?.status === 401) {
              useAuth.getState().logout();
              router.push("/login");
            }
          }
        };
        fetchApps();
      }
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [mounted, token, router, setApplications]);

  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!token) {
    return null;
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
