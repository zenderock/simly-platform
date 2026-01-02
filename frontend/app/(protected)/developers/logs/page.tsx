"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRequestLogs, useRequestLog, RequestLogFilters } from "@/hooks/use-request-logs";
import { RequestLogDetail } from "@/components/developers/request-log-detail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IconList,
  IconArrowLeft,
  IconRefresh,
  IconFilter,
  IconClock,
  IconSearch,
  IconX,
} from "@tabler/icons-react";

const STATUS_FILTERS = [
  { value: "all", label: "All Statuses" },
  { value: "2xx", label: "2xx Success" },
  { value: "4xx", label: "4xx Client Error" },
  { value: "5xx", label: "5xx Server Error" },
];

export default function RequestLogsPage() {
  const [pathFilter, setPathFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Build filters based on UI state
  const activeFilters: RequestLogFilters = {
    limit: 100,
    path: pathFilter || undefined,
  };

  const { data: logs = [], isLoading, refetch, isRefetching } = useRequestLogs(activeFilters);
  const { data: selectedLog, isLoading: isLoadingDetail } = useRequestLog(selectedLogId || 0);

  // Filter logs by status category on client side for better UX
  const filteredLogs = logs.filter((log) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "2xx") return log.status_code >= 200 && log.status_code < 300;
    if (statusFilter === "4xx") return log.status_code >= 400 && log.status_code < 500;
    if (statusFilter === "5xx") return log.status_code >= 500;
    return true;
  });

  const handleViewLog = (logId: number) => {
    setSelectedLogId(logId);
    setDetailOpen(true);
  };

  const clearFilters = () => {
    setPathFilter("");
    setStatusFilter("all");
  };

  const hasActiveFilters = pathFilter || statusFilter !== "all";

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-background">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/developers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-2"
        >
          <IconArrowLeft className="size-3.5" />
          Back to Developer Portal
        </Link>
        <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-[10px]">
          <IconList className="size-3.5" />
          Request Logs
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">API Request History</h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl leading-relaxed">
          View and debug your API requests. Logs are retained for the last 30 days.
        </p>
      </div>

      {/* Filters */}
      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconFilter className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">Filters</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <IconX className="size-3.5 mr-1" />
                  Clear
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                <IconRefresh className={`size-3.5 mr-1 ${isRefetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by endpoint path (e.g., /v1/messages)"
                  value={pathFilter}
                  onChange={(e) => setPathFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Requests</CardTitle>
              <CardDescription>
                Showing {filteredLogs.length} of {logs.length} requests (max 100)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <IconList className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No request logs found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasActiveFilters
                  ? "Try adjusting your filters"
                  : "API requests will appear here once you start making calls"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Timestamp</TableHead>
                    <TableHead className="w-[80px]">Method</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                    <TableHead className="w-[100px] text-right">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log, index) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleViewLog(log.id)}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getMethodColor(log.method)}>
                          {log.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.path}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(log.status_code)}>
                          {log.status_code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="flex items-center justify-end gap-1 text-sm text-muted-foreground">
                          <IconClock className="size-3" />
                          {log.duration_ms}ms
                        </span>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Log Detail Modal */}
      <RequestLogDetail
        log={selectedLog || null}
        isLoading={isLoadingDetail}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </main>
  );
}
