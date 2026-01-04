"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NewMessageForm } from "./new-message-form";

export function NewMessageDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="gap-2 sm:gap-3 h-8 sm:h-9 text-xs sm:text-sm bg-foreground text-background shadow-none font-bold"
        >
          <Plus className="size-3 sm:size-4" />
          <span className="hidden xs:inline">New Message</span>
          <span className="xs:hidden">New</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden border-border/40 shadow-xl">
        <DialogHeader className="p-6 bg-muted/30 border-b">
          <DialogTitle className="text-xl font-bold tracking-tight">
            Send New Message
          </DialogTitle>
          <DialogDescription className="text-muted-foreground/80 mt-1.5">
            Send a text message via your connected Android devices.
          </DialogDescription>
        </DialogHeader>

        <NewMessageForm
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
