"use client";

import { RequestLog } from "@/hooks/use-request-logs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IconClock,
  IconArrowRight,
  IconArrowLeft,
  IconWorld,
  IconDeviceDesktop,
} from "@tabler/icons-react";

interface RequestLogDetailProps {
  log: RequestLog | null;
  isLoading?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestLogDetail({
  log,
  isLoading,
  open,
  onOpenChange,
}: RequestLogDetailProps) {
  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "bg-green-500/10 text-green-600 border-green-500/20";
    if (status >= 400 && status < 500) return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    if (status >= 500) return "bg-red-500/10 text-red-600 border-red-500/20";
    return "bg-gray-500/10 text-gray-600 border-gray-500/20";
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "POST":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "PUT":
      case "PATCH":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      case "DELETE":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };


  const formatJson = (str: string | undefined): string => {
    if (!str) return "No data";
    try {
      const parsed = JSON.parse(str);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return str;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Request Details
            {log && (
              <Badge variant="outline" className={getStatusColor(log.status_code)}>
                {log.status_code}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Full request and response details for this API call
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : log ? (
          <div className="flex-1 overflow-auto space-y-4">
            {/* Request Summary */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={getMethodColor(log.method)}>
                  {log.method}
                </Badge>
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  {log.path}
                </code>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <IconClock className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{log.duration_ms}ms</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconWorld className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">IP:</span>
                  <span className="font-mono text-xs">{log.ip_address}</span>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <IconDeviceDesktop className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground shrink-0">User Agent:</span>
                  <span className="font-mono text-xs truncate" title={log.user_agent}>
                    {log.user_agent || "N/A"}
                  </span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                {formatDate(log.created_at)}
              </div>
            </div>

            {/* Request/Response Tabs */}
            <Tabs defaultValue="request" className="flex-1">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="request" className="flex items-center gap-1">
                  <IconArrowRight className="size-3" />
                  Request
                </TabsTrigger>
                <TabsTrigger value="response" className="flex items-center gap-1">
                  <IconArrowLeft className="size-3" />
                  Response
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="request" className="mt-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Request Body</h4>
                  <div className="rounded-lg border bg-zinc-950 p-4 overflow-auto max-h-64">
                    <pre className="text-sm text-zinc-300 font-mono whitespace-pre-wrap">
                      {formatJson(log.request_body)}
                    </pre>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="response" className="mt-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Response Body</h4>
                  <div className="rounded-lg border bg-zinc-950 p-4 overflow-auto max-h-64">
                    <pre className="text-sm text-zinc-300 font-mono whitespace-pre-wrap">
                      {formatJson(log.response_body)}
                    </pre>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No log data available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
