"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApplicationStore } from "@/store/application-store";
import {
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Folder,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { CreateApplicationDialog } from "@/components/applications/create-application-dialog";
import api from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import LoaderQuater from "@/components/loader";
import { Label } from "@/components/ui/label";

export default function ApplicationsPage() {
  const {
    applications,
    fetchApplications,
    removeApplication,
    updateApplication,
  } = useApplicationStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingApp, setEditingApp] = useState<any>(null);
  const [renamingName, setRenamingName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const filteredApps = applications.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: number) => {
    if (applications.length <= 1) {
      toast({
        title: "Cannot delete application",
        description: "You must have at least one application.",
        variant: "destructive",
      });
      return;
    }

    if (
      !confirm(
        "Are you sure you want to delete this application? This action cannot be undone."
      )
    )
      return;

    setIsDeleting(true);
    try {
      await api.delete(`/applications/${id}`);
      removeApplication(id);
      toast({ title: "Application deleted", variant: "default" });
    } catch (e) {
      toast({ title: "Failed to delete", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp) return;

    // Validation
    if (
      editingApp.slack_webhook_url &&
      !editingApp.slack_webhook_url.startsWith(
        "https://hooks.slack.com/services/"
      )
    ) {
      toast({
        title: "Invalid Slack Webhook",
        description: "URL must start with https://hooks.slack.com/services/",
        variant: "destructive",
      });
      return;
    }

    setIsRenaming(true);
    try {
      await api.put(`/applications/${editingApp.id}`, {
        name: renamingName,
        is_sandbox: editingApp.is_sandbox,
        slack_webhook_url: editingApp.slack_webhook_url,
        ntfy_topic: editingApp.ntfy_topic,
      });
      fetchApplications();
      toast({ title: "Application updated", variant: "success" });
      setEditingApp(null);
    } catch (e: any) {
      toast({
        title: "Failed to update",
        description: e.response?.data || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsRenaming(false);
    }
  };

  const openRenameDialog = (app: any) => {
    setEditingApp(app);
    setRenamingName(app.name);
  };

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 space-y-8 bg-background">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Applications
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-lg">
            Create and manage your applications to organize API access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CreateApplicationDialog onCreated={fetchApplications} />
        </div>
      </div>

      <div className="space-y-4">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search applications..."
            className="pl-10 h-10 shadow-none border-zinc-200 dark:border-zinc-800 focus-visible:ring-[#8c52ff]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-none">
                <TableHead className="font-bold text-muted-foreground text-[10px] uppercase italic">
                  Name
                </TableHead>
                <TableHead className="font-bold text-muted-foreground text-[10px] uppercase italic">
                  Mode
                </TableHead>
                <TableHead className="font-bold text-muted-foreground text-[10px] uppercase italic text-right">
                  Created
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Folder className="size-8 mb-2 opacity-50" />
                      <p className="text-sm">No applications found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredApps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                          <Folder className="size-4" />
                        </div>
                        <span className="font-semibold">{app.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`gap-1 pr-3 ${
                          app.is_sandbox
                            ? "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/10 dark:text-orange-400 dark:border-orange-900/30"
                            : "bg-green-50 text-green-600 border-green-200 dark:bg-green-900/10 dark:text-green-400 dark:border-green-900/30"
                        }`}
                      >
                        {app.is_sandbox ? (
                          <ShieldAlert className="size-3" />
                        ) : (
                          <ShieldCheck className="size-3" />
                        )}
                        {app.is_sandbox ? "Sandbox" : "Live"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground font-mono">
                      {new Date(app.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openRenameDialog(app)}
                          >
                            <Pencil className="size-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(app.id)}
                            className="text-destructive font-bold"
                          >
                            <Trash2 className="size-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingApp}
        onOpenChange={(open) => !open && setEditingApp(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleRenameSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Application</DialogTitle>
              <DialogDescription>
                Update application settings and alerts.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-6">
              <div className="space-y-2">
                <Label
                  htmlFor="rename-input"
                  className="font-bold text-xs uppercase text-muted-foreground"
                >
                  Name
                </Label>
                <Input
                  id="rename-input"
                  value={renamingName}
                  onChange={(e) => setRenamingName(e.target.value)}
                  className="h-10"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="edit-slack"
                  className="font-bold text-xs uppercase text-muted-foreground"
                >
                  Slack Webhook URL (Optional)
                </Label>
                <Input
                  id="edit-slack"
                  placeholder="https://hooks.slack.com/services/..."
                  value={editingApp?.slack_webhook_url || ""}
                  onChange={(e) =>
                    setEditingApp({
                      ...editingApp,
                      slack_webhook_url: e.target.value,
                    })
                  }
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="edit-ntfy"
                  className="font-bold text-xs uppercase text-muted-foreground"
                >
                  Ntfy Topic (Optional)
                </Label>
                <Input
                  id="edit-ntfy"
                  placeholder="e.g. my-secure-topic-123"
                  value={editingApp?.ntfy_topic || ""}
                  onChange={(e) =>
                    setEditingApp({ ...editingApp, ntfy_topic: e.target.value })
                  }
                  className="h-10"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isRenaming}>
                {isRenaming ? (
                  <LoaderQuater className="size-4 animate-spin mr-2" />
                ) : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
