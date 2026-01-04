"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Folder, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import api from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import LoaderQuater from "../loader";
import { useAuth } from "@/lib/auth";
import { useApplicationStore } from "@/store/application-store";
import { IconRocket, IconLock } from "@tabler/icons-react";
import Link from "next/link";
import { getErrorMessage } from "@/lib/utils";

interface CreateApplicationDialogProps {
  onCreated: () => void;
  children?: React.ReactNode;
}

export function CreateApplicationDialog({
  onCreated,
  children,
}: CreateApplicationDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { organizations, organizationId } = useAuth();
  const { applications } = useApplicationStore();

  const currentOrg = organizations.find((o) => o.id === organizationId);
  const maxApps = currentOrg?.max_applications ?? 0;
  const currentAppCount = applications.filter(
    (a) => a.organization_id === organizationId
  ).length;
  // -1 means unlimited
  const isLimitReached = maxApps !== -1 && currentAppCount >= maxApps;

  const [formData, setFormData] = useState({
    name: "",
    logo_url: "",
    is_sandbox: false,
    slack_webhook_url: "",
    ntfy_topic: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (
      formData.slack_webhook_url &&
      !formData.slack_webhook_url.startsWith(
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

    setLoading(true);
    try {
      await api.post("/applications", formData);
      toast({
        title: "Application Created",
        description: `${formData.name} is ready.`,
        variant: "success",
      });
      onCreated();
      setOpen(false);
      setFormData({
        name: "",
        logo_url: "",
        is_sandbox: false,
        slack_webhook_url: "",
        ntfy_topic: "",
      });
    } catch (error: any) {
      const msg = getErrorMessage(error);
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="gap-2 bg-black dark:bg-[#8c52ff] dark:hover:bg-[#5b32cc] text-white shadow-lg shadow-[#8c52ff]/10 font-bold">
            <Plus className="size-4" />
            Create Application
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {isLimitReached ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="size-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4">
              <IconLock className="size-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-lg font-bold">Limit Reached</h3>
            <p className="text-sm text-muted-foreground mt-2 mb-6 max-w-[300px]">
              You have reached the maximum number of applications ({maxApps})
              for your current plan.
            </p>
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
              <Button
                className="flex-1 gap-2 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-0"
                asChild
              >
                <Link href="/organization/plans">
                  <IconRocket className="size-4" />
                  Upgrade Plan
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>New Application</DialogTitle>
              <DialogDescription>
                A project helps you organize your API keys and webhook
                configurations.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-6">
              <div className="grid gap-2">
                <Label
                  htmlFor="name"
                  className="font-bold text-xs uppercase text-muted-foreground tracking-widest"
                >
                  Application Name
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Marketing SMS, Auth OTP"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="h-10"
                />
              </div>

              <div className="grid gap-2">
                <Label
                  htmlFor="logo"
                  className="font-bold text-xs uppercase text-muted-foreground tracking-widest"
                >
                  Application Logo (Optional)
                </Label>
                <div className="flex items-center gap-4">
                  {formData.logo_url && (
                    <img
                      src={formData.logo_url}
                      alt="Logo"
                      className="size-10 rounded-md object-cover"
                    />
                  )}
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    className="h-10 text-xs"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      if (file.size > 1 * 1024 * 1024) {
                        toast({
                          title: "File too large",
                          description: "Logo size must be less than 1MB",
                          variant: "destructive",
                        });
                        return;
                      }

                      try {
                        const uploadData = new FormData();
                        uploadData.append("file", file);
                        uploadData.append("folder", "logos");

                        const res = await api.post("/upload", uploadData, {
                          headers: { "Content-Type": "multipart/form-data" },
                        });

                        setFormData((prev) => ({
                          ...prev,
                          logo_url: res.data.url,
                        }));
                      } catch (err) {
                        toast({
                          title: "Upload Failed",
                          description: "Could not upload logo",
                          variant: "destructive",
                        });
                      }
                    }}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label
                  htmlFor="slack_webhook_url"
                  className="font-bold text-xs uppercase text-muted-foreground tracking-widest"
                >
                  Slack Webhook URL (Optional)
                </Label>
                <Input
                  id="slack_webhook_url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={formData.slack_webhook_url}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slack_webhook_url: e.target.value,
                    })
                  }
                  className="h-10"
                />
                <p className="text-[10px] text-muted-foreground">
                  Receive device offline alerts directly in Slack.
                </p>
              </div>

              <div className="grid gap-2">
                <Label
                  htmlFor="ntfy_topic"
                  className="font-bold text-xs uppercase text-muted-foreground tracking-widest"
                >
                  Ntfy Topic (Optional)
                </Label>
                <Input
                  id="ntfy_topic"
                  placeholder="e.g. my-secure-topic-123"
                  value={formData.ntfy_topic}
                  onChange={(e) =>
                    setFormData({ ...formData, ntfy_topic: e.target.value })
                  }
                  className="h-10"
                />
                <p className="text-[10px] text-muted-foreground">
                  Receive alerts via Ntfy.sh app.
                </p>
              </div>

              <div
                className={`p-4 rounded-xl border transition-all ${
                  formData.is_sandbox
                    ? "bg-orange-50/50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/50"
                    : "bg-zinc-50/50 border-zinc-200 dark:bg-zinc-900/50 dark:border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="sandbox" className="font-bold text-sm">
                        Sandbox Mode
                      </Label>
                      {formData.is_sandbox ? (
                        <ShieldAlert className="size-3.5 text-orange-500" />
                      ) : (
                        <ShieldCheck className="size-3.5 text-zinc-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight max-w-[200px]">
                      Messages sent via a sandbox application won&apos;t be
                      real. Useful for testing.
                    </p>
                  </div>
                  <Switch
                    id="sandbox"
                    checked={formData.is_sandbox}
                    onCheckedChange={(val) =>
                      setFormData({ ...formData, is_sandbox: val })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="w-full font-bold h-11"
                disabled={loading}
              >
                {loading ? (
                  <LoaderQuater className="mr-2 size-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 size-4" />
                )}
                Create Application
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
