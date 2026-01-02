"use client";

import { Webhook } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Copy, Globe, Eye, EyeOff, Play, Loader2, CheckCircle2, XCircle } from "lucide-react";
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
import LoaderQuater from "../loader";

interface WebhookCardProps {
  webhook: Webhook;
  onDelete: () => void;
}

interface TestResult {
  success: boolean;
  status_code?: number;
  message: string;
  duration_ms: number;
}

export function WebhookCard({ webhook, onDelete }: WebhookCardProps) {
  const [showSecret, setShowSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
      variant: "success",
    });
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const response = await api.post<TestResult>(`/webhooks/${webhook.id}/test`);
      setTestResult(response.data);
      
      if (response.data.success) {
        toast({
          title: "Test Successful",
          description: `Webhook responded with status ${response.data.status_code} in ${response.data.duration_ms}ms`,
          variant: "success",
        });
      } else {
        toast({
          title: "Test Failed",
          description: response.data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorResult: TestResult = {
        success: false,
        message: "Failed to send test request",
        duration_ms: 0,
      };
      setTestResult(errorResult);
      toast({
        title: "Test Failed",
        description: "Could not send test webhook",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/webhooks/${webhook.id}`);
      toast({
        title: "Webhook deleted",
        description: "The webhook has been permanently removed.",
        variant: "success",
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

  // Mask the secret to show only first and last 4 characters
  const maskedSecret = webhook.secret.length > 12 
    ? `${webhook.secret.slice(0, 6)}••••••••${webhook.secret.slice(-4)}`
    : "••••••••••••";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Globe className="size-4 text-muted-foreground" />
            <span className="truncate max-w-[250px] md:max-w-[400px]">{webhook.url}</span>
          </CardTitle>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {eventTypes.map((type) => (
            <Badge key={type} variant="secondary" className="text-xs">
              {type}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center space-x-2 bg-muted/50 p-3 rounded-md">
          <div className="grid gap-1.5 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Signing Secret</p>
            <div className="flex items-center justify-between">
              <code className="text-sm font-mono truncate max-w-[280px]">
                {showSecret ? webhook.secret : maskedSecret}
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

        {/* Test Result Display */}
        {testResult && (
          <div className={`p-3 rounded-md text-sm ${
            testResult.success 
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700" 
              : "bg-red-50 border border-red-200 text-red-700"
          }`}>
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <XCircle className="size-4" />
              )}
              <span className="font-medium">
                {testResult.success ? "Test Passed" : "Test Failed"}
              </span>
              {testResult.status_code && (
                <Badge variant="outline" className="ml-auto text-xs">
                  {testResult.status_code}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs opacity-80">
              {testResult.message}
              {testResult.duration_ms > 0 && ` (${testResult.duration_ms}ms)`}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-between bg-muted/20 py-3">
        <p className="text-xs text-muted-foreground">
          Created on {new Date(webhook.created_at).toLocaleDateString()}
        </p>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleTest}
            disabled={isTesting}
            className="gap-1.5"
          >
            {isTesting ? (
              <LoaderQuater className="size-3" />
            ) : (
              <Play className="size-3" />
            )}
            Test
          </Button>

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
        </div>
      </CardFooter>
    </Card>
  );
}
