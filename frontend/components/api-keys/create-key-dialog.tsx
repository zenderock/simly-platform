"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Application, APIKey } from "@/types";
import api from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { useCreateApiKey } from "@/hooks/use-api-keys";
import {  IconCopy, IconKey, IconPlus, IconShieldCheck, IconShieldX } from "@tabler/icons-react";
import LoaderQuater from "../loader";
import { EyeOff, Eye, Check } from "lucide-react";

interface CreateKeyDialogProps {
  applications: Application[];
  onCreated: () => void;
}

export function CreateKeyDialog({ applications, onCreated }: CreateKeyDialogProps) {
  const [open, setOpen] = useState(false);
  const [newKey, setNewKey] = useState<APIKey | null>(null);
  const [showKey, setShowKey] = useState(false);
  const { toast } = useToast();
  const createKeyMutation = useCreateApiKey();

  const [formData, setFormData] = useState({
    name: "",
    application_id: "",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createKeyMutation.mutateAsync({
        name: formData.name,
        application_id: parseInt(formData.application_id),
      });
      setNewKey(result);
      onCreated(); // Still call the callback for any additional logic
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create API key.",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setOpen(false);
    setNewKey(null);
    setShowKey(false);
    setFormData({ name: "", application_id: "" });
  };

  const selectedApp = applications.find(a => a.id.toString() === formData.application_id);

  return (
    <Dialog open={open} onOpenChange={(val) => {
        if (!createKeyMutation.isPending) setOpen(val);
        if (!val) handleReset();
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-foreground text-background shadow-lg shadow-zinc-200 dark:shadow-none font-bold">
          <IconPlus className="size-4" />
          Generate New Key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        {!newKey ? (
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Assign a new key to an application to start authenticating requests.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-6">
              <div className="grid gap-2">
                <Label htmlFor="name" className="font-bold text-xs uppercase text-muted-foreground tracking-widest">Key Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Server Production"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="h-10"
                />
              </div>
              <div className="grid gap-2 w-full">
                <Label htmlFor="app" className="font-bold text-xs uppercase text-muted-foreground tracking-widest">Application</Label>
                <Select
                  value={formData.application_id}
                  onValueChange={(val) => setFormData({ ...formData, application_id: val })}
                  required
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select an application" />
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    {applications.map((app) => (
                      <SelectItem key={app.id} value={app.id.toString()}>
                        <div className="flex items-center gap-2">
                          {app.is_sandbox ? <IconShieldX className="size-3.5 text-orange-500" /> : <IconShieldCheck className="size-3.5 text-primary" />}
                          <span>{app.name}</span>
                          {app.is_sandbox && <span className="text-[10px] text-orange-500 font-bold ml-1">(Sandbox)</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedApp && (
                <div className={`p-3 rounded-lg text-xs leading-relaxed ${
                  selectedApp.is_sandbox 
                    ? "bg-orange-50 border border-orange-100 text-orange-600" 
                    : "bg-emerald-50 border border-emerald-100 text-emerald-600"
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {selectedApp.is_sandbox ? (
                      <IconShieldX className="size-4" />
                    ) : (
                      <IconShieldCheck className="size-4" />
                    )}
                    <strong>{selectedApp.is_sandbox ? "Test Key" : "Live Key"}</strong>
                    <code className="ml-auto font-mono text-[10px] bg-white/50 px-1.5 py-0.5 rounded">
                      {selectedApp.is_sandbox ? "sk_test_*" : "sk_live_*"}
                    </code>
                  </div>
                  <p>
                    {selectedApp.is_sandbox 
                      ? "Messages sent via this key will be simulated for testing purposes. No real SMS will be sent."
                      : "Messages sent via this key will be delivered to real devices. Use with caution in production."}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full font-bold h-11" disabled={createKeyMutation.isPending}>
                {createKeyMutation.isPending ? <LoaderQuater className="mr-2 size-4" /> : <IconKey className="mr-2 size-4" />}
                Generate Secret Key
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-6">
            <DialogHeader>
              <DialogTitle>API Key Generated</DialogTitle>
              <DialogDescription className="text-emerald-600 font-medium">
                Please copy your key now. You won&apos;t be able to see it again!
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={newKey.key}
                  readOnly
                  className="pr-24 font-mono text-sm h-12 bg-muted/50 border-2 border-emerald-500/30"
                />
                <div className="absolute right-1 top-1 flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="size-10"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="size-10"
                    onClick={() => {
                        if (newKey.key) {
                            navigator.clipboard.writeText(newKey.key);
                            toast({ title: "Copied!", description: "API Key copied to clipboard.", variant: "success" });
                        }
                    }}
                  >
                    <IconCopy className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30">
                 <div className="flex gap-3">
                   <div className="size-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                     <Check className="size-4 text-white" />
                   </div>
                   <div className="text-xs text-emerald-800 dark:text-emerald-400 space-y-1">
                      <p className="font-bold uppercase tracking-wider text-[10px]">Securely Saved</p>
                      <p className="leading-tight opacity-90 text-[11px]">
                        The key has been hashed and stored in our vault. Keep it safe as it gives programmatic access to your {selectedApp?.name} gateway.
                      </p>
                   </div>
                 </div>
              </div>
            </div>

            <Button onClick={handleReset} className="w-full font-bold h-11" variant="outline">
              Done, I&apos;ve saved it
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
