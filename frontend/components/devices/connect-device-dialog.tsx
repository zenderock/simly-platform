"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ConnectDeviceContent } from "./connect-device-content";

interface ConnectDeviceDialogProps {
  disabled?: boolean;
}

export function ConnectDeviceDialog({ disabled }: ConnectDeviceDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={disabled}
          className="shrink-0 gap-2 bg-black hover:bg-neutral-800 text-white border-none shadow-lg shadow-black/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="size-4" />
          Add a Device
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Connect New Device</DialogTitle>
          <DialogDescription>
            Turn your Android phone into an SMS Gateway in 2 minutes.
          </DialogDescription>
        </DialogHeader>

        <ConnectDeviceContent
          onSuccess={() => setOpen(false)}
          isDialog={true}
        />
      </DialogContent>
    </Dialog>
  );
}
