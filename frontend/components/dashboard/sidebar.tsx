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
  Settings,
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
  HelpCircle,
  Globe,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutGrid,
    href: "/dashboard",
  },
  {
    title: "Messages",
    icon: Mail,
    href: "/messages",
  },
  {
    title: "Appareils",
    icon: Smartphone,
    href: "/devices",
  },
  {
    title: "Clés API",
    icon: Key,
    href: "/api-keys",
  },
];

export function DashboardSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const [appsOpen, setAppsOpen] = React.useState(true);
  const pathname = usePathname();
  const { user, organizations, logout } = useAuth();

  return (
    <Sidebar collapsible="offcanvas" className="lg:border-r-0!" {...props}>
      <SidebarHeader className="p-3 sm:p-4 lg:p-5 pb-0">
        <div className="flex items-center gap-2">
          <div className="flex size-5 items-center justify-center rounded bg-primary text-primary-foreground">
            <Atom className="size-3" />
          </div>
          <span className="font-semibold text-base sm:text-lg">Simly</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 sm:px-4 lg:px-5">
        {/* Active Application Context - Reusing Template Style */}
        <div className="flex items-center gap-2 sm:gap-3 rounded-lg border bg-card p-2 sm:p-3 mb-3 sm:mb-4 mt-4">
          <div className="flex size-8 sm:size-[34px] items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
            <Folder className="size-4 sm:size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs sm:text-sm">Default Project</p>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Key className="size-3 sm:size-3.5" />
              <span className="text-[10px] sm:text-xs">API Active</span>
            </div>
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
                      <item.icon className="size-4 sm:size-5" />
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
                  PROJETS
                </div>
              </CollapsibleTrigger>
              <MoreHorizontal className="size-4 cursor-pointer hover:text-foreground transition-colors" />
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu className="mt-2">
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="h-9 sm:h-[38px]">
                      <Link href="/applications">
                        <Folder className="size-4 sm:size-5 text-muted-foreground" />
                        <span className="flex-1 text-muted-foreground text-sm truncate">
                          Production Gateway
                        </span>
                        <div className="size-1.5 rounded-full bg-primary shrink-0" />
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="h-9 sm:h-[38px]">
                      <Link href="/applications">
                        <Folder className="size-4 sm:size-5 text-muted-foreground" />
                        <span className="flex-1 text-muted-foreground text-sm truncate">
                          Test Sandbox
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter className="px-3 sm:px-4 lg:px-5 pb-3 sm:pb-4 lg:pb-5">
        <SidebarMenu className="mb-4">
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-9 sm:h-[38px]">
              <Link href="#">
                <HelpCircle className="size-4 sm:size-5" />
                <span className="text-sm">Centre d'aide</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-9 sm:h-[38px]">
              <Link href="/settings">
                <Settings className="size-4 sm:size-5" />
                <span className="text-sm">Paramètres</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors border bg-card/50">
              <Avatar className="size-7 sm:size-8">
                <AvatarImage src={`https://api.dicebear.com/9.x/initials/svg?seed=${user?.name || "U"}`} />
                <AvatarFallback className="text-xs uppercase">{user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs sm:text-sm truncate">{user?.name || "Utilisateur"}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                   {user?.email}
                </p>
              </div>
              <ChevronDown className="size-4 text-muted-foreground shrink-0" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem>
              <UserCircle className="size-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CreditCard className="size-4 mr-2" />
              Billing
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive font-medium" onClick={() => logout()}>
              <LogOut className="size-4 mr-2" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
