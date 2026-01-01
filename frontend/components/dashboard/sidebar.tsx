"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  LayoutGrid,
  Mail,
  FileText,
  ChevronRight,
  ChevronDown,
  Atom,
  LogOut,
  UserCircle,
  CreditCard,
  Folder,
  Smartphone,
  Key,
  MoreHorizontal,
  Globe,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Crown,
  ArrowUp,
  Webhook,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useApplicationStore } from "@/store/application-store";
import Image from "next/image";
import { CreateAppDialog } from "./create-app-dialog";

import { IconLogs,IconCreditCard,IconHome2,IconMail,IconDeviceMobile,IconKey,IconUsers,IconSpeakerphone } from '@tabler/icons-react';

const menuItems = [
  {
    title: "Dashboard",
    icon: IconHome2,
    href: "/dashboard",
  },
  {
    title: "Messages",
    icon: IconMail,
    href: "/messages",
  },
  {
    title: "Devices",
    icon: IconDeviceMobile,
    href: "/devices",
  },
  {
    title: "Contacts",
    icon: IconUsers,
    href: "/contacts",
  },
  {
    title: "Campaigns",
    icon: IconSpeakerphone,
    href: "/campaigns",
  },
  {
    title: "API Keys",
    icon: IconKey,
    href: "/api-keys",
  },
  {
    title: "Webhooks",
    icon: IconLogs,
    href: "/webhooks",
  },
  {
    title: "Billing",
    icon: IconCreditCard,
    href: "/organization/plans",
  },
];

export function DashboardSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const [appsOpen, setAppsOpen] = React.useState(true);
  const pathname = usePathname();
  const { user, logout, organizations, organizationId } = useAuth();
  const { applications, activeAppId, setActiveAppId, getActiveApp } = useApplicationStore();
  const activeApp = getActiveApp();
  const currentOrg = organizations.find((org) => org.id === organizationId);

  return (
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
            {activeApp ? (activeApp.is_sandbox ? <ShieldAlert className="size-4 sm:size-5" /> : <Folder className="size-4 sm:size-5" />) : <Folder className="size-4 sm:size-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs sm:text-sm truncate">{activeApp?.name || "No App Selected"}</p>
            {activeApp && (
              <div className="flex items-center gap-1 text-muted-foreground">
                {activeApp.is_sandbox ? (
                  <>
                    <ShieldAlert className="size-3 text-orange-500" />
                    <span className="text-[10px] sm:text-xs font-bold text-orange-500">Sandbox</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-3 text-emerald-500" />
                    <span className="text-[10px] sm:text-xs font-bold text-emerald-500">Production</span>
                  </>
                )}
              </div>
            )}
            {!activeApp && (
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Select an application to get started
              </p>
            )}
          </div>
        </div>

        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    className="h-9 sm:h-[38px]"
                  >
                    <Link href={item.href}>
                      <item.icon className="size-6 sm:size-6" />
                      <span className="text-sm font-medium">{item.title}</span>
                      {pathname === item.href && (
                        <ChevronRight className="ml-auto size-4 text-muted-foreground opacity-60" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Collapsible open={appsOpen} onOpenChange={setAppsOpen} className="mt-4">
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="flex items-center justify-between px-0 text-[10px] sm:text-[11px] font-semibold tracking-wider text-muted-foreground">
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-pointer">
                  <ChevronDown
                    className={`size-3 sm:size-3.5 transition-transform ${
                      appsOpen ? "" : "-rotate-90"
                    }`}
                  />
                  APPLICATIONS
                </div>
              </CollapsibleTrigger>
              <CreateAppDialog>
                 <Plus className="size-4 cursor-pointer hover:text-foreground transition-colors" />
              </CreateAppDialog>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu className="mt-2">
                  {applications.map((app) => (
                    <SidebarMenuItem key={app.id}>
                      <SidebarMenuButton 
                        isActive={activeAppId === app.id} 
                        className="h-9 sm:h-[38px]"
                        onClick={() => setActiveAppId(app.id)}
                      >
                        <Folder className={`size-4 sm:size-5 ${activeAppId === app.id ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`flex-1 text-sm truncate ${activeAppId === app.id ? "font-bold" : "text-muted-foreground"}`}>
                          {app.name}
                        </span>
                        {app.is_sandbox && (
                          <div className="size-1.5 rounded-full bg-orange-500 shrink-0" />
                        )}
                        {!app.is_sandbox && activeAppId === app.id && (
                          <div className="size-1.5 rounded-full bg-primary shrink-0" />
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  <SidebarMenuItem>
                     <CreateAppDialog>
                         <SidebarMenuButton className="h-9 sm:h-[38px] border-zinc-200/50 text-muted-foreground hover:text-primary">
                               <Plus className="size-4" />
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
        {/* Upgrade Card */}
        {currentOrg && currentOrg.plan !== "enterprise" && (
          <div className="mb-4 p-3 rounded-lg bg-linear-to-r from-purple-50 to-gray-50 border border-purple-200 dark:from-purple-950/50 dark:to-gray-950/50 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="size-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                Upgrade Plan
              </span>
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-300 mb-3">
              Get more SMS, devices, and premium features
            </p>
            <Link href="/organization/plans">
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-1">
                <ArrowUp className="size-3" />
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
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                   {user?.email}
                </p>
              </div>
              <ChevronDown className="size-4 text-muted-foreground shrink-0" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <UserCircle className="size-4 mr-2" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive font-medium" onClick={() => logout()}>
              <LogOut className="size-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
