"use client";

import React, { useEffect } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Building2, 
  Check, 
  ChevronsUpDown, 
  PlusCircle,
  Bell,
  Search,
  Command
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

export function DashboardHeader() {
  const { organizationId, organizations, setOrganizations, setOrganizationId } = useAuth();

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const response = await api.get("/organizations");
        setOrganizations(response.data);
      } catch (error) {
        console.error("Failed to fetch organizations", error);
      }
    };

    fetchOrgs();
  }, [setOrganizations]);

  const activeOrg = organizations.find(org => org.id === organizationId);

  return (
    <header className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 h-16 border-b bg-card/80 backdrop-blur-md sticky top-0 z-20 w-full transition-all">
      <SidebarTrigger className="-ml-1" />
      
      <div className="flex items-center gap-2 sm:gap-4 flex-1">
        {/* Org Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 px-2 hover:bg-accent/50 h-9 transition-colors"
            >
              <div className="size-6 rounded bg-primary/10 flex items-center justify-center text-primary">
                 <Building2 className="size-3.5" />
              </div>
              <span className="font-bold text-sm truncate max-w-[120px] sm:max-w-[200px]">{activeOrg?.name || "Organization"}</span>
              <ChevronsUpDown className="size-3.5 text-muted-foreground opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[240px]" align="start">
            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider font-bold p-3">My Organizations</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {organizations.map((org) => (
              <DropdownMenuItem 
                key={org.id} 
                className="flex items-center justify-between cursor-pointer py-2.5 px-3"
                onSelect={() => setOrganizationId(org.id)}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-muted-foreground" />
                  <span className={cn(
                    "text-sm font-semibold",
                    org.id === organizationId ? "text-primary" : "text-foreground"
                  )}>{org.name}</span>
                </div>
                {org.id === organizationId && <Check className="size-4 text-primary" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer py-2.5 px-3 text-primary font-medium">
              <PlusCircle className="size-4 mr-2" />
              <span className="text-sm">Create an organization</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Global Search - Premium Template Feature */}
        <div className="hidden md:flex relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search everywhere..."
            className="pl-9 pr-12 h-9 bg-background/50 border shadow-none focus-visible:ring-1 focus-visible:ring-primary w-full"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-muted px-1.5 py-0.5 rounded border text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <Command className="size-2.5" />
            <span>K</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-accent/50 relative">
          <Bell className="size-4" />
          <span className="absolute top-2 right-2 size-2 bg-primary rounded-full border-2 border-card" />
        </Button>
        <div className="h-4 w-px bg-border mx-1" />
        <ThemeToggle />
      </div>
    </header>
  );
}
