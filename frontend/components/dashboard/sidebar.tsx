"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { useAuth } from "@/lib/auth";
import { useApplicationStore } from "@/store/application-store";
import { useUpdateApplication, useDeleteApplication } from "@/hooks/use-applications";
import Image from "next/image";
import { CreateAppDialog } from "./create-app-dialog";
import { Application } from "@/types";

import { IconLogs, IconCreditCard, IconHome2, IconMail, IconDeviceMobile, IconKey, IconUsers, IconSpeakerphone, IconShieldHalfFilled, IconCategory2, IconChevronDown, IconChevronRight, IconFolder, IconPlus, IconConfetti, IconEye, IconLogout, IconUserCircle, IconPencil, IconTrash, IconCode, IconBook, IconPlayerPlay, IconList } from '@tabler/icons-react';

const menuItems = [
  { title: "Dashboard", icon: IconHome2, href: "/dashboard" },
  { title: "Messages", icon: IconMail, href: "/messages" },
  { title: "Devices", icon: IconDeviceMobile, href: "/devices" },
  { title: "Contacts", icon: IconUsers, href: "/contacts" },
  { title: "Campaigns", icon: IconSpeakerphone, href: "/campaigns" },
  { title: "API Keys", icon: IconKey, href: "/api-keys" },
  { title: "Webhooks", icon: IconLogs, href: "/webhooks" },
  { title: "Billing", icon: IconCreditCard, href: "/organization/plans" },
];

const developerMenuItems = [
  { title: "Overview", icon: IconCode, href: "/developers" },
  { title: "API Docs", icon: IconBook, href: "/developers/docs" },
  { title: "Playground", icon: IconPlayerPlay, href: "/developers/playground" },
  { title: "Logs", icon: IconList, href: "/developers/logs" },
];

export function DashboardSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [appsOpen, setAppsOpen] = React.useState(true);
  const [developersOpen, setDevelopersOpen] = React.useState(true);
  const pathname = usePathname();
  const { user, logout, organizations, organizationId } = useAuth();
  const { applications, activeAppId, setActiveAppId, getActiveApp, updateApplication, removeApplication } = useApplicationStore();
  const activeApp = getActiveApp();
  const currentOrg = organizations.find((org) => org.id === organizationId);
  
  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = React.useState(false);
  const [appToRename, setAppToRename] = React.useState<Application | null>(null);
  const [newAppName, setNewAppName] = React.useState("");
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [appToDelete, setAppToDelete] = React.useState<Application | null>(null);
  
  const updateAppMutation = useUpdateApplication();
  const deleteAppMutation = useDeleteApplication();

  const handleRenameClick = (app: Application) => {
    setAppToRename(app);
    setNewAppName(app.name);
    setRenameDialogOpen(true);
  };

  const handleRenameSubmit = () => {
    if (!appToRename || !newAppName.trim() || newAppName === appToRename.name) {
      setRenameDialogOpen(false);
      return;
    }
    
    const trimmedName = newAppName.trim();
    const previousName = appToRename.name;
    
    // Optimistic update on Zustand store
    updateApplication(appToRename.id, trimmedName);
    setRenameDialogOpen(false);
    
    updateAppMutation.mutate(
      { id: appToRename.id, name: trimmedName },
      {
        onError: () => {
          // Rollback on error
          updateApplication(appToRename.id, previousName);
        },
      }
    );
  };

  const handleDeleteClick = (app: Application) => {
    setAppToDelete(app);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!appToDelete) return;
    
    const appId = appToDelete.id;
    const previousApps = [...applications];
    
    // Optimistic update on Zustand store
    removeApplication(appId);
    setDeleteDialogOpen(false);
    
    deleteAppMutation.mutate(appId, {
      onError: () => {
        // Rollback - refetch applications
        useApplicationStore.getState().fetchApplications();
      },
    });
  };

  return (
    <>
      <Sidebar collapsible="offcanvas" className="lg:border-r-0!" {...props}>
        <SidebarHeader className="p-3 sm:p-4 lg:p-5 pb-0">
          <div className="flex items-center gap-2">
            <Image src="/logo-dark.png" alt="Simly" width={100} height={100} className="dark:hidden" />
            <Image src="/logo-light.png" alt="Simly" width={100} height={100} className="hidden dark:block" />
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3 sm:px-4 lg:px-5">
          {/* Active Application Context */}
          <div className="flex items-center gap-2 sm:gap-3 rounded-lg border bg-card p-2 sm:p-3 mb-3 sm:mb-4 mt-4">
            <div className={`flex size-8 sm:size-[34px] items-center justify-center rounded-lg shrink-0 ${activeApp ? (activeApp.is_sandbox ? "bg-orange-500 text-white" : "bg-primary text-primary-foreground") : "bg-muted text-muted-foreground"}`}>
              {activeApp ? (activeApp.is_sandbox ? <IconShieldHalfFilled className="size-4 sm:size-5" /> : <IconCategory2 className="size-4 sm:size-5" />) : <IconFolder className="size-4 sm:size-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs sm:text-sm truncate">{activeApp?.name || "No App Selected"}</p>
              {activeApp && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  {activeApp.is_sandbox ? (
                    <>
                      <IconShieldHalfFilled className="size-3 text-orange-500" />
                      <span className="text-[10px] sm:text-xs font-bold text-orange-500">Sandbox</span>
                    </>
                  ) : (
                    <>
                      <IconCategory2 className="size-3 text-emerald-500" />
                      <span className="text-[10px] sm:text-xs font-bold text-emerald-500">Production</span>
                    </>
                  )}
                </div>
              )}
              {!activeApp && (
                <p className="text-[10px] sm:text-xs text-muted-foreground">Select an application to get started</p>
              )}
            </div>
          </div>

          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.href} className="h-9 sm:h-[38px]">
                      <Link href={item.href}>
                        <item.icon className="size-6 sm:size-6" />
                        <span className="text-sm font-medium">{item.title}</span>
                        {pathname === item.href && <IconChevronRight className="ml-auto size-4 text-muted-foreground opacity-60" />}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <Collapsible open={developersOpen} onOpenChange={setDevelopersOpen} className="mt-4">
            <SidebarGroup className="p-0">
              <SidebarGroupLabel className="flex items-center justify-between px-0 text-[10px] sm:text-[11px] font-semibold tracking-wider text-muted-foreground">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-1.5 cursor-pointer">
                    <IconChevronDown className={`size-3 sm:size-3.5 transition-transform ${developersOpen ? "" : "-rotate-90"}`} />
                    DEVELOPERS
                  </div>
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu className="mt-2">
                    {developerMenuItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={pathname === item.href} className="h-9 sm:h-[38px]">
                          <Link href={item.href}>
                            <item.icon className={`size-4 sm:size-5 ${pathname === item.href ? "text-primary" : "text-muted-foreground"}`} />
                            <span className={`text-sm ${pathname === item.href ? "font-bold" : "text-muted-foreground"}`}>{item.title}</span>
                            {pathname === item.href && <IconChevronRight className="ml-auto size-4 text-muted-foreground opacity-60" />}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>

          <Collapsible open={appsOpen} onOpenChange={setAppsOpen} className="mt-4">
            <SidebarGroup className="p-0">
              <SidebarGroupLabel className="flex items-center justify-between px-0 text-[10px] sm:text-[11px] font-semibold tracking-wider text-muted-foreground">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-1.5 cursor-pointer">
                    <IconChevronDown className={`size-3 sm:size-3.5 transition-transform ${appsOpen ? "" : "-rotate-90"}`} />
                    APPLICATIONS
                  </div>
                </CollapsibleTrigger>
                <CreateAppDialog>
                  <IconPlus className="size-4 cursor-pointer hover:text-foreground transition-colors" />
                </CreateAppDialog>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu className="mt-2">
                    {applications.map((app) => (
                      <SidebarMenuItem key={app.id}>
                        <ContextMenu>
                          <ContextMenuTrigger asChild>
                            <SidebarMenuButton 
                              isActive={activeAppId === app.id} 
                              className="h-9 sm:h-[38px] w-full"
                              onClick={() => setActiveAppId(app.id)}
                            >
                              <IconCategory2 className={`size-4 sm:size-5 ${activeAppId === app.id ? "text-primary" : "text-muted-foreground"}`} />
                              <span className={`flex-1 text-sm truncate ${activeAppId === app.id ? "font-bold" : "text-muted-foreground"}`}>
                                {app.name}
                              </span>
                              {app.is_sandbox && <div className="size-1.5 rounded-full bg-orange-500 shrink-0" />}
                              {!app.is_sandbox && activeAppId === app.id && <div className="size-1.5 rounded-full bg-primary shrink-0" />}
                            </SidebarMenuButton>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem onClick={() => handleRenameClick(app)}>
                              <IconPencil className="size-4 mr-2" />
                              Rename
                            </ContextMenuItem>
                            <ContextMenuItem className="text-destructive" onClick={() => handleDeleteClick(app)}>
                              <IconTrash className="size-4 mr-2" />
                              Delete
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      </SidebarMenuItem>
                    ))}
                    <SidebarMenuItem>
                      <CreateAppDialog>
                        <SidebarMenuButton className="h-9 sm:h-[38px] border-zinc-200/50 text-muted-foreground hover:text-primary">
                          <IconPlus className="size-4" />
                          <span className="text-xs">Create New App</span>
                        </SidebarMenuButton>
                      </CreateAppDialog>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        </SidebarContent>

        <SidebarFooter className="px-3 sm:px-4 lg:px-5 pb-3 sm:pb-4 lg:pb-5">
          {currentOrg && currentOrg.plan !== "enterprise" && (
            <div className="mb-4 p-3 rounded-lg bg-linear-to-r from-purple-50 to-gray-50 border border-purple-200 dark:from-purple-950/50 dark:to-gray-950/50 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <IconConfetti className="size-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">Upgrade Plan</span>
              </div>
              <p className="text-xs text-purple-700 dark:text-purple-300 mb-3">Get more SMS, devices, and premium features</p>
              <Link href="/organization/plans">
                <button className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-1">
                  <IconEye className="size-3" />
                  View Plans
                </button>
              </Link>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors border bg-card/50">
                <Avatar className="size-7 sm:size-8">
                  <AvatarImage src={`https://api.dicebear.com/9.x/initials/svg?seed=${user?.name || "U"}`} />
                  <AvatarFallback className="text-xs uppercase">{user?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs sm:text-sm truncate">{user?.name || "User"}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <IconChevronDown className="size-4 text-muted-foreground shrink-0" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <IconUserCircle className="size-4 mr-2" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <div className="px-2 py-1.5 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive font-medium" onClick={() => logout()}>
                <IconLogout className="size-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Application</DialogTitle>
            <DialogDescription>Enter a new name for "{appToRename?.name}"</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="app-name">Application Name</Label>
            <Input
              id="app-name"
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value)}
              placeholder="My Application"
              className="mt-2"
              onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRenameSubmit} disabled={updateAppMutation.isPending}>
              {updateAppMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{appToDelete?.name}"? This action cannot be undone and will delete all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteAppMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
