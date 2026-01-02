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
import { Plus, Folder, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import api from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import LoaderQuater from "../loader";

interface CreateApplicationDialogProps {
  onCreated: () => void;
}

export function CreateApplicationDialog({ onCreated }: CreateApplicationDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    is_sandbox: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setFormData({ name: "", is_sandbox: false });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create application.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-[#6e3ff3] hover:bg-[#5b32cc] text-white shadow-lg shadow-[#6e3ff3]/10 font-bold">
          <Plus className="size-4" />
          Create Application
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Application</DialogTitle>
            <DialogDescription>
              A project helps you organize your API keys and webhook configurations.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid gap-2">
              <Label htmlFor="name" className="font-bold text-xs uppercase text-muted-foreground tracking-widest">Application Name</Label>
              <Input
                id="name"
                placeholder="e.g. Marketing SMS, Auth OTP"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="h-10"
              />
            </div>
            
            <div className={`p-4 rounded-xl border transition-all ${formData.is_sandbox ? "bg-orange-50/50 border-orange-200" : "bg-zinc-50/50 border-zinc-200"}`}>
               <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="sandbox" className="font-bold text-sm">Sandbox Mode</Label>
                      {formData.is_sandbox ? <ShieldAlert className="size-3.5 text-orange-500" /> : <ShieldCheck className="size-3.5 text-zinc-400" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight max-w-[200px]">
                      Messages sent via a sandbox application won&apos;t be real. Useful for testing.
                    </p>
                  </div>
                  <Switch 
                    id="sandbox"
                    checked={formData.is_sandbox}
                    onCheckedChange={(val) => setFormData({ ...formData, is_sandbox: val })}
                  />
               </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full font-bold h-11" disabled={loading}>
              {loading ? <LoaderQuater className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
              Create Application
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
