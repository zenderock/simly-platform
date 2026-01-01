"use client";

import { Webhook } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Copy, Globe, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import api from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface WebhookCardProps {
  webhook: Webhook;
  onDelete: () => void;
}

export function WebhookCard({ webhook, onDelete }: WebhookCardProps) {
  const [showSecret, setShowSecret] = useState(false);
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/webhooks/${webhook.id}`);
      toast({
        title: "Webhook deleted",
        description: "The webhook has been permanently removed.",
      });
      onDelete();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete webhook.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const eventTypes = webhook.event_types.split(",");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Globe className="size-4 text-muted-foreground" />
            <span className="truncate max-w-[250px] md:max-w-[400px]">{webhook.url}</span>
          </CardTitle>
        </div>
        <div className="flex gap-2">
          {eventTypes.map((type) => (
            <Badge key={type} variant="secondary" className="text-xs">
              {type}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex items-center space-x-2 bg-muted/50 p-3 rounded-md">
          <div className="grid gap-1.5 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Signing Secret</p>
            <div className="flex items-center justify-between">
              <code className="text-sm font-mono truncate max-w-[280px]">
                {showSecret ? webhook.secret : "whsec_••••••••••••••••••••••••••••"}
              </code>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => copyToClipboard(webhook.secret, "Secret")}
                >
                  <Copy className="size-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between bg-muted/20 py-3">
        <p className="text-xs text-muted-foreground">
          Created on {new Date(webhook.created_at).toLocaleDateString()}
        </p>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="size-4 mr-2" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the webhook
                subscription for <strong>{webhook.url}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                {isDeleting ? "Deleting..." : "Delete Webhook"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
