"use client";

import React, { useEffect } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Check, 
  ChevronsUpDown, 
  PlusCircle,
  Settings
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { CreateOrgDialog } from "@/components/dashboard/create-org-dialog";
import { NotificationDropdown } from "@/components/dashboard/notifications";
import { GlobalSearch } from "@/components/dashboard/global-search";
import Link from "next/link";
import { IconBuilding } from "@tabler/icons-react";

export function DashboardHeader() {
  const { organizationId, organizations, setOrganizations, setOrganizationId } = useAuth();
  const [createOrgOpen, setCreateOrgOpen] = React.useState(false);

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
                 <IconBuilding className="size-3.5" />
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
                  <IconBuilding className="size-4 text-muted-foreground" />
                  <span className={cn(
                    "text-sm font-semibold",
                    org.id === organizationId ? "text-primary" : "text-foreground"
                  )}>{org.name}</span>
                </div>
                {org.id === organizationId && <Check className="size-4 text-primary" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/organization" className="cursor-pointer py-2.5 px-3 text-muted-foreground">
                <Settings className="size-4 mr-2" />
                <span className="text-sm">Organization Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="cursor-pointer py-2.5 px-3 text-primary font-medium"
              onSelect={() => setCreateOrgOpen(true)}
            >
              <PlusCircle className="size-4 mr-2" />
              <span className="text-sm">Create an organization</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Global Search */}
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <NotificationDropdown />
      </div>

      <CreateOrgDialog open={createOrgOpen} onOpenChange={setCreateOrgOpen} />
    </header>
  );
}
