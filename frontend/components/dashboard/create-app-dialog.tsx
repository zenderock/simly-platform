"use client";

import * as React from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox"; // Assuming we have checkbox
import api from "@/lib/api";
import { useApplicationStore } from "@/store/application-store";
import { useToast } from "@/components/ui/use-toast";

interface CreateAppDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateAppDialog({ children, open: controlledOpen, onOpenChange: setControlledOpen }: CreateAppDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen || setInternalOpen;
  
  const [isLoading, setIsLoading] = React.useState(false);
  const [name, setName] = React.useState("");
  const { fetchApplications, setActiveAppId } = useApplicationStore();
  const { toast } = useToast();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // isSandbox defaults to false for created apps for now, or we can add toggle
      const response = await api.post("/applications", { name, is_sandbox: false });
      
      toast({ title: "Application created", description: `${name} has been created successfully.`, variant: "success" });
      await fetchApplications();
      
      // Auto select the new app
      if (response.data?.id) {
          setActiveAppId(response.data.id);
      }
      
      setOpen(false);
      setName("");
    } catch (error) {
      console.error(error);
      toast({ title: "Failed to create application", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
            <Button variant="outline" size="sm" className="w-full justify-start">
                <Plus className="size-4 mr-2" />
                Create Application
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Create Application</DialogTitle>
            <DialogDescription>
              Create a new application to manage your messaging separately.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Application Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Marketing App"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
