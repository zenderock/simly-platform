"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, Download, Upload, FileText } from "lucide-react";

import { useAuth } from "@/lib/auth";

export function WelcomeSection() {
  const { user } = useAuth();
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
      <div className="space-y-2 sm:space-y-5">
        <h2 className="text-xl sm:text-[24px] font-bold leading-relaxed tracking-tight">
          Welcome back, {user?.name?.split(' ')[0] || "User"}!
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Today you have <span className="text-foreground font-semibold">145 messages</span> pending,{" "}
          <span className="text-emerald-500 font-semibold italic">all your devices are online</span>
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

        <Button size="sm" className="gap-2 sm:gap-3 h-8 sm:h-9 text-xs sm:text-sm bg-foreground text-background shadow-none font-bold">
          <Plus className="size-3 sm:size-4" />
          <span className="hidden xs:inline">New Message</span>
          <span className="xs:hidden">New</span>
        </Button>
      </div>
    </div>
  );
}
