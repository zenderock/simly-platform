"use client";

import { useAuth } from "@/lib/auth";
import { Folder, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ApplicationsPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
          <p className="text-muted-foreground">Manage your projects and their API access.</p>
        </div>
        <Button className="shrink-0 gap-2">
          <Plus className="size-4" />
          New Application
        </Button>
      </div>

      <Card className="border shadow-none">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search for an application..." className="pl-9" />
            </div>
          </div>

          <div className="grid gap-4">
            <Card className="border shadow-none hover:bg-accent/50 transition-colors cursor-pointer group">
              <div className="p-4 flex items-center gap-4">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Folder className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">My First Project</h3>
                  <p className="text-xs text-muted-foreground truncate">Created 2 hours ago</p>
                </div>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  Manage
                </Button>
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
