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
          Ravi de vous revoir, {user?.name?.split(' ')[0] || "Utilisateur"}!
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Aujourd'hui vous avez <span className="text-foreground font-semibold">145 messages</span> en attente,{" "}
          <span className="text-emerald-500 font-semibold italic">tous vos appareils sont en ligne</span>
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 sm:gap-3 h-8 sm:h-9 text-xs sm:text-sm shadow-none border font-medium">
              <span className="hidden xs:inline">Journal d'activité</span>
              <span className="xs:hidden">
                <Download className="size-4" />
              </span>
              <ChevronDown className="size-3 sm:size-4 text-muted-foreground opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Download className="size-4 mr-2" />
              Exporter CSV
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FileText className="size-4 mr-2" />
              Rapport PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" className="gap-2 sm:gap-3 h-8 sm:h-9 text-xs sm:text-sm bg-foreground text-background shadow-none font-bold">
          <Plus className="size-3 sm:size-4" />
          <span className="hidden xs:inline">Nouvel Envoi</span>
          <span className="xs:hidden">New</span>
        </Button>
      </div>
    </div>
  );
}
