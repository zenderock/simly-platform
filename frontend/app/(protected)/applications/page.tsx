"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { 
  Folder, 
  Plus, 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  MoreVertical,
  Trash2,
  Calendar,
  LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { Application } from "@/types";
import { CreateApplicationDialog } from "@/components/applications/create-application-dialog";
import { useApplicationStore } from "@/store/application-store";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ApplicationsPage() {
  const { applications, setApplications } = useApplicationStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshToggle, setRefreshToggle] = useState(0);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        setLoading(true);
        const res = await api.get<Application[]>("/applications");
        setApplications(res.data || []);
      } catch (e) {
        console.error("Failed to fetch apps", e);
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, [refreshToggle, setApplications]);

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure? This will delete all API keys and history for this application.")) {
      try {
        await api.delete(`/applications/${id}`);
        setRefreshToggle(prev => prev + 1);
      } catch (e) {
        alert("Failed to delete application");
      }
    }
  };

  const filteredApps = applications.filter((a: Application) => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 space-y-8 bg-background">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#6e3ff3] font-bold uppercase tracking-[0.2em] text-[10px]">
            <LayoutGrid className="size-3.5" />
            Workspace
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Applications</h1>
          <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
            Manage your project environments. Separate Production from Sandbox to test your logic safely.
          </p>
        </div>
        <CreateApplicationDialog onCreated={() => setRefreshToggle(prev => prev + 1)} />
      </div>

      <div className="relative group max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-colors group-focus-within:text-[#6e3ff3]" />
        <Input 
          placeholder="Filter applications..." 
          className="pl-10 h-11 border-zinc-200 bg-zinc-50/50 focus:bg-white transition-all shadow-none" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl w-full" />)
        ) : filteredApps.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {filteredApps.map((app: Application) => (
              <motion.div
                key={app.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`group relative flex flex-col p-5 rounded-2xl border bg-card transition-all hover:border-[#6e3ff3]/30 hover:shadow-xl hover:shadow-[#6e3ff3]/5 ${app.is_sandbox ? "border-dashed border-orange-200" : ""}`}
              >
                <div className="flex items-start justify-between mb-4">
                   <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${app.is_sandbox ? "bg-orange-50 text-orange-600" : "bg-primary/10 text-primary"}`}>
                      {app.is_sandbox ? <ShieldAlert className="size-6" /> : <Folder className="size-6" />}
                   </div>
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                       <DropdownMenuItem 
                         className="text-destructive font-bold gap-2"
                         onClick={() => handleDelete(app.id)}
                       >
                         <Trash2 className="size-4" />
                         Delete Application
                       </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-1">
                   <div className="flex items-center gap-2">
                     <h3 className="font-bold tracking-tight text-lg">{app.name}</h3>
                     {app.is_sandbox && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-[10px] h-4 py-0 px-1 font-extrabold uppercase tracking-widest">
                          Sandbox
                        </Badge>
                     )}
                   </div>
                   <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        <span>{new Date(app.created_at).toLocaleDateString()}</span>
                      </div>
                   </div>
                </div>

                <div className="mt-6">
                  <Button 
                    variant="outline" 
                    className="w-full text-xs font-bold h-9 bg-background hover:bg-[#6e3ff3] hover:text-white transition-all border-zinc-200"
                    onClick={() => window.location.href = `/api-keys?application_id=${app.id}`}
                  >
                    Manage Access
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center opacity-60">
             <div className="size-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
               <Search className="size-6 text-zinc-400" />
             </div>
             <p className="text-zinc-500 font-medium">No applications found matching your search</p>
          </div>
        )}
      </div>
    </main>
  );
}
