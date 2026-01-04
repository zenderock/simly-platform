"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Search,
  Filter,
  FileInput,
  MoreHorizontal,
  X,
  Eye,
  Trash2,
  Copy,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
} from "lucide-react";
import { useDashboardStore } from "@/store/dashboard-store";
import { useApplicationStore } from "@/store/application-store";
import { useMessages } from "@/hooks/use-messages";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

export function MessagesTable() {
  const activeAppId = useApplicationStore((state) => state.activeAppId);
  const { toast } = useToast();
  const searchQuery = useDashboardStore((state) => state.searchQuery);
  const statusFilter = useDashboardStore((state) => state.statusFilter);
  const appFilter = useDashboardStore((state) => state.appFilter);
  const deviceFilter = useDashboardStore((state) => state.deviceFilter);

  const setSearchQuery = useDashboardStore((state) => state.setSearchQuery);
  const setStatusFilter = useDashboardStore((state) => state.setStatusFilter);
  const setAppFilter = useDashboardStore((state) => state.setAppFilter);
  const setDeviceFilter = useDashboardStore((state) => state.setDeviceFilter);
  const clearFilters = useDashboardStore((state) => state.clearFilters);

  const searchParams = useSearchParams();
  const campaignId = searchParams.get("campaign");
  const { data: messages = [], isLoading: loading } = useMessages(
    activeAppId,
    campaignId ? parseInt(campaignId) : null
  );
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [selectedMessage, setSelectedMessage] = React.useState<any>(null); // Uses any for now as message type is inferred

  const handleCopyId = (id: number) => {
    navigator.clipboard.writeText(id.toString());
    toast({
      title: "Copied!",
      description: "Message ID copied to clipboard.",
    });
  };

  React.useEffect(() => {
    const deviceParam = searchParams.get("device");
    if (deviceParam) {
      setDeviceFilter(deviceParam);
    }
  }, [searchParams, setDeviceFilter]);

  const hasActiveFilters =
    statusFilter !== "all" || appFilter !== "all" || deviceFilter !== "all";

  const uniqueApps = React.useMemo(() => {
    const names = messages.map((m) => m.application_name || "Direct API");
    return Array.from(new Set(names)).sort();
  }, [messages]);

  const uniqueDevices = React.useMemo(() => {
    const names = messages.map((m) => m.device_name || "Unknown");
    return Array.from(new Set(names)).sort();
  }, [messages]);

  const uniqueStatuses = React.useMemo(() => {
    const s = messages.map((m) => m.status.toLowerCase());
    return Array.from(new Set(s)).sort();
  }, [messages]);

  const filteredMessages = React.useMemo(() => {
    return messages.filter((msg) => {
      const matchesSearch =
        msg.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (msg.application_name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (msg.device_name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        msg.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesApp =
        appFilter === "all" || msg.application_name === appFilter;

      const matchesDevice =
        deviceFilter === "all" || msg.device_name === deviceFilter;

      return matchesSearch && matchesStatus && matchesApp && matchesDevice;
    });
  }, [messages, searchQuery, statusFilter, appFilter, deviceFilter]);

  const totalPages = Math.ceil(filteredMessages.length / pageSize);

  const paginatedMessages = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredMessages.slice(startIndex, endIndex);
  }, [filteredMessages, currentPage, pageSize]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, appFilter, deviceFilter, pageSize]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "sent":
        return "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-none font-bold";
      case "delivered":
        return "bg-green-600/10 text-green-600 hover:bg-green-600/10 border-none font-bold";
      case "failed":
        return "bg-destructive/10 text-destructive hover:bg-destructive/10 border-none font-bold";
      case "pending":
        return "bg-amber-500/10 text-amber-500 hover:bg-amber-500/10 border-none font-bold";
      case "scheduled":
        return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/10 border-none font-bold";
      case "processing":
        return "bg-purple-500/10 text-purple-500 hover:bg-purple-500/10 border-none font-bold";
      case "queued":
        return "bg-orange-500/10 text-orange-500 hover:bg-orange-500/10 border-none font-bold";
      case "cancelled":
        return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/10 border-none font-bold";
      case "expired":
        return "bg-red-800/10 text-red-800 hover:bg-red-800/10 border-none font-bold";
      default:
        return "bg-slate-500/10 text-slate-500 hover:bg-slate-500/10 border-none font-bold";
    }
  };

  const handleExportCSV = () => {
    if (filteredMessages.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no messages matching your current filters.",
        variant: "destructive",
      });
      return;
    }

    try {
      const headers = [
        "ID",
        "Recipient",
        "Message",
        "Application",
        "Status",
        "Device",
        "Date",
        "Scheduled At",
      ];

      const rows = filteredMessages.map((msg) => [
        msg.id,
        msg.to,
        `"${(msg.body || "").replace(/"/g, '""')}"`,
        msg.application_name || "Direct API",
        msg.status,
        msg.device_name || "—",
        msg.created_at ? new Date(msg.created_at).toISOString() : "",
        msg.scheduled_at ? new Date(msg.scheduled_at).toISOString() : "",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `messages_export_${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: `Exported ${filteredMessages.length} messages to CSV.`,
      });
    } catch (error) {
      console.error("Export failed", error);
      toast({
        title: "Export failed",
        description: "An error occurred while exporting data.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="rounded-xl border bg-card shadow-none">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:px-6 sm:py-3.5">
        <div className="flex items-center gap-2 sm:gap-2.5 flex-1">
          <Button
            variant="outline"
            size="icon"
            className="size-7 sm:size-8 shrink-0 shadow-none"
          >
            <MessageSquare className="size-4 sm:size-[18px] text-muted-foreground" />
          </Button>
          <span className="text-sm sm:text-base font-bold italic uppercase tracking-tight">
            Recent Messages
          </span>
          <Badge
            variant="secondary"
            className="ml-1 text-[10px] sm:text-xs font-bold bg-muted/50"
          >
            {filteredMessages.length}
          </Badge>
          {campaignId && (
            <Badge
              variant="outline"
              className="ml-1 text-[10px] sm:text-xs font-bold bg-primary/10 text-primary border-primary/20"
            >
              Campaign #{campaignId}
              <X
                className="ml-1 size-3 cursor-pointer"
                onClick={() => window.history.pushState({}, "", "/messages")}
              />
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-[160px] lg:w-[200px] h-8 sm:h-9 text-xs shadow-none italic"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-8 sm:h-9 gap-1.5 sm:gap-2 shadow-none font-semibold ${
                  hasActiveFilters ? "border-primary" : ""
                }`}
              >
                <Filter className="size-3.5 sm:size-4" />
                <span className="hidden sm:inline">Filter</span>
                {hasActiveFilters && (
                  <span className="size-1.5 sm:size-2 rounded-full bg-primary" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[220px]">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={statusFilter === "all"}
                onCheckedChange={() => setStatusFilter("all")}
              >
                All statuses
              </DropdownMenuCheckboxItem>
              {uniqueStatuses.map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={statusFilter === status}
                  onCheckedChange={() => setStatusFilter(status)}
                  className="capitalize"
                >
                  {status}
                </DropdownMenuCheckboxItem>
              ))}

              <DropdownMenuSeparator />

              <DropdownMenuLabel>Filter by Application</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={appFilter === "all"}
                onCheckedChange={() => setAppFilter("all")}
              >
                All apps
              </DropdownMenuCheckboxItem>
              {uniqueApps.map((app) => (
                <DropdownMenuCheckboxItem
                  key={app}
                  checked={appFilter === app}
                  onCheckedChange={() => setAppFilter(app)}
                >
                  {app}
                </DropdownMenuCheckboxItem>
              ))}

              <DropdownMenuSeparator />

              <DropdownMenuLabel>Filter by Device</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={deviceFilter === "all"}
                onCheckedChange={() => setDeviceFilter("all")}
              >
                All devices
              </DropdownMenuCheckboxItem>
              {uniqueDevices.map((device) => (
                <DropdownMenuCheckboxItem
                  key={device}
                  checked={deviceFilter === device}
                  onCheckedChange={() => setDeviceFilter(device)}
                >
                  {device}
                </DropdownMenuCheckboxItem>
              ))}

              {hasActiveFilters && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={clearFilters}
                    className="text-destructive font-bold"
                  >
                    <X className="size-4 mr-2" />
                    Reset
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden sm:block w-px h-[22px] bg-border" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 sm:h-9 gap-1.5 sm:gap-2 shadow-none font-semibold"
              >
                <FileInput className="size-3.5 sm:size-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileSpreadsheet className="size-4 mr-2" />
                CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="px-3 sm:px-6 pb-3 sm:pb-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30 border-none">
              <TableHead className="w-[40px] font-bold text-muted-foreground text-[10px] uppercase italic">
                #
              </TableHead>
              <TableHead className="min-w-[150px] font-bold text-muted-foreground text-[10px] uppercase italic">
                Recipient
              </TableHead>
              <TableHead className="min-w-[200px] font-bold text-muted-foreground text-[10px] uppercase italic">
                Message
              </TableHead>
              <TableHead className="min-w-[100px] font-bold text-muted-foreground text-[10px] uppercase italic">
                App
              </TableHead>
              <TableHead className="min-w-[100px] font-bold text-muted-foreground text-[10px] uppercase italic">
                Status
              </TableHead>
              <TableHead className="min-w-[120px] font-bold text-muted-foreground text-[10px] uppercase italic">
                Device
              </TableHead>
              <TableHead className="min-w-[100px] font-bold text-muted-foreground text-[10px] uppercase italic text-right">
                Date
              </TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMessages.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground text-sm italic"
                >
                  No messages found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedMessages.map((msg, index) => (
                <TableRow
                  key={msg.id}
                  className="border-muted/50 transition-colors"
                >
                  <TableCell className="font-medium text-xs text-muted-foreground italic">
                    {(currentPage - 1) * pageSize + index + 1}
                  </TableCell>
                  <TableCell className="font-bold text-xs tabular-nums">
                    {msg.to}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground italic">
                    {msg.body}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold bg-muted/30 border-none"
                    >
                      {msg.application_name || "Direct API"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getStatusColor(msg.status)}
                    >
                      {msg.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-medium text-muted-foreground">
                    {msg.device_name ||
                      (msg.status === "pending" || msg.status === "scheduled"
                        ? "Auto"
                        : "—")}
                  </TableCell>
                  <TableCell className="text-right text-[10px] text-muted-foreground italic">
                    {msg.scheduled_at ? (
                      <div className="flex items-center justify-end gap-1 text-blue-500">
                        <Clock className="size-3" />
                        {new Date(msg.scheduled_at).toLocaleDateString(
                          "en-US",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </div>
                    ) : (
                      new Date(msg.created_at).toLocaleDateString("en-US", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setSelectedMessage(msg)}
                        >
                          <Eye className="size-4 mr-2" />
                          Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyId(msg.id)}>
                          <Copy className="size-4 mr-2" />
                          Copy ID
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 sm:px-6 py-3 border-t bg-muted/10">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium italic">
          <span className="hidden sm:inline italic">Rows per page:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => setPageSize(Number(value))}
          >
            <SelectTrigger className="h-7 w-[60px] shadow-none bg-background text-[11px] font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem
                  key={size}
                  value={size.toString()}
                  className="text-[11px]"
                >
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground ml-2">
            {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, filteredMessages.length)} of{" "}
            {filteredMessages.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-7 shadow-none"
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-7 shadow-none"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="size-3.5" />
          </Button>

          <div className="flex items-center gap-1 mx-1">
            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 3) {
                pageNum = i + 1;
              } else if (currentPage <= 2) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 1) {
                pageNum = totalPages - 2 + i;
              } else {
                pageNum = currentPage - 1 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="icon"
                  className="size-7 shadow-none text-xs font-bold"
                  onClick={() => goToPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="size-7 shadow-none"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-7 shadow-none"
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="size-3.5" />
          </Button>
        </div>
      </div>

      <Dialog
        open={!!selectedMessage}
        onOpenChange={(open) => !open && setSelectedMessage(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Message Details</DialogTitle>
            <DialogDescription>
              Message ID:{" "}
              <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                {selectedMessage?.id}
              </code>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-right text-sm font-medium text-muted-foreground">
                Recipient
              </span>
              <span className="col-span-3 text-sm font-semibold">
                {selectedMessage?.to}
              </span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-right text-sm font-medium text-muted-foreground">
                App
              </span>
              <span className="col-span-3">
                <Badge variant="outline" className="bg-muted/50">
                  {selectedMessage?.application_name || "Direct API"}
                </Badge>
              </span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-right text-sm font-medium text-muted-foreground">
                Status
              </span>
              <span className="col-span-3">
                <Badge
                  variant="outline"
                  className={
                    selectedMessage
                      ? getStatusColor(selectedMessage.status)
                      : ""
                  }
                >
                  {selectedMessage?.status}
                </Badge>
              </span>
            </div>
            {selectedMessage?.device_name && (
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right text-sm font-medium text-muted-foreground">
                  Device
                </span>
                <span className="col-span-3 text-sm">
                  {selectedMessage.device_name}
                </span>
              </div>
            )}
            <div className="space-y-2 pt-2">
              <span className="text-sm font-medium text-muted-foreground">
                Message Body
              </span>
              <div className="rounded-md bg-muted/50 p-3 text-sm shadow-inner max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                {selectedMessage?.body}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-[10px] text-muted-foreground pt-2 border-t">
              <div>
                <span className="block font-medium">Created</span>
                {selectedMessage?.created_at &&
                  new Date(selectedMessage.created_at).toLocaleString()}
              </div>
              {selectedMessage?.scheduled_at && (
                <div className="text-right">
                  <span className="block font-medium">Scheduled</span>
                  {new Date(selectedMessage.scheduled_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
