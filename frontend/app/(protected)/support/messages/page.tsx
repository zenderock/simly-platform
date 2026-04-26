"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import {
  useSupportMessageEvents,
  useSupportMessages,
} from "@/hooks/use-support-messages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MessageEvent, SupportMessage } from "@/types";
import {
  AlertTriangle,
  Eye,
  Loader2,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

const statuses = ["all", "queued", "scheduled", "pending", "sent", "delivered", "failed"];
const categories = [
  "all",
  "no_device",
  "push_failed",
  "sms_provider",
  "quota_reached",
  "send_window",
  "device_offline",
  "unknown",
];

function isPlatformAdminUser(user?: { email?: string; is_platform_admin?: boolean } | null) {
  return (
    !!user?.is_platform_admin ||
    user?.email?.trim().toLowerCase().endsWith("@zenderock.me")
  );
}

export default function SupportMessagesPage() {
  const user = useAuth((state) => state.user);
  const [search, setSearch] = React.useState("");
  const [organizationId, setOrganizationId] = React.useState("");
  const [status, setStatus] = React.useState("failed");
  const [failureCategory, setFailureCategory] = React.useState("all");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [selected, setSelected] = React.useState<SupportMessage | null>(null);

  const { data: messages = [], isLoading } = useSupportMessages({
    search,
    organizationId,
    status,
    failureCategory,
    startDate,
    endDate,
  });
  const { data: events = [], isLoading: loadingEvents } =
    useSupportMessageEvents(selected?.id);

  if (!isPlatformAdminUser(user)) {
    return (
      <main className="flex-1 overflow-auto p-6">
        <div className="rounded-md border bg-card p-6">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-4" />
            Platform support
          </div>
          <p className="text-sm text-muted-foreground">
            This workspace user is not marked as a platform admin.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-auto bg-background p-4 sm:p-6 lg:p-8">
      <div className="mb-5 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <ShieldCheck className="size-4" />
          Platform support
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Message investigation</h1>
      </div>

      <div className="mb-4 grid gap-3 rounded-md border bg-card p-3 lg:grid-cols-[1fr_140px_150px_170px_140px_140px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search ID, phone, org, body"
            className="pl-9"
          />
        </div>
        <Input
          value={organizationId}
          onChange={(event) => setOrganizationId(event.target.value)}
          placeholder="Org ID"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={failureCategory} onValueChange={setFailureCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="size-4 text-muted-foreground" />
            {messages.length} messages
          </div>
          {isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Failure</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[56px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((message) => (
                <TableRow key={message.id}>
                  <TableCell className="font-mono text-xs">{message.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{message.organization_name}</div>
                    <div className="text-xs text-muted-foreground">#{message.organization_id}</div>
                  </TableCell>
                  <TableCell>{message.to}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{message.status}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    <div className="flex items-center gap-1 text-xs font-semibold">
                      {message.status === "failed" && <AlertTriangle className="size-3 text-destructive" />}
                      {message.last_error_code || message.failure_category || "-"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {message.last_error || ""}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{message.device_name || "-"}</div>
                    {message.sim_slot !== undefined && (
                      <div className="text-xs text-muted-foreground">SIM {message.sim_slot}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(message.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setSelected(message)}>
                      <Eye className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && messages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                    No support messages match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Message #{selected?.id}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3 rounded-md border bg-muted/20 p-3 text-sm sm:grid-cols-2">
              <Field label="Organization" value={`${selected?.organization_name} (#${selected?.organization_id})`} />
              <Field label="Application" value={selected?.application_name || "Direct API"} />
              <Field label="Recipient" value={selected?.to || ""} />
              <Field label="Device" value={selected?.device_name || "-"} />
              <Field label="Failure category" value={selected?.failure_category || "-"} />
              <Field label="Error code" value={selected?.last_error_code || "-"} />
            </div>
            {selected?.last_error && (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm">
                {selected.last_error}
              </div>
            )}
            <Timeline events={events} loading={loadingEvents} />
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function Timeline({ events, loading }: { events: MessageEvent[]; loading: boolean }) {
  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading timeline...</div>;
  }

  return (
    <div className="max-h-[300px] space-y-2 overflow-y-auto rounded-md border p-3">
      {events.map((event) => (
        <div key={event.id} className="grid gap-1 rounded border bg-background p-2 text-xs sm:grid-cols-[150px_1fr]">
          <div className="text-muted-foreground">{new Date(event.created_at).toLocaleString()}</div>
          <div>
            <div className="flex flex-wrap items-center gap-2 font-semibold">
              {event.event_type}
              <Badge variant="outline" className="text-[10px]">{event.source}</Badge>
              <span className="font-normal text-muted-foreground">attempt {event.attempt}</span>
            </div>
            {(event.reason_code || event.reason_message) && (
              <div className="mt-1 text-muted-foreground">
                {event.reason_code && <span className="font-mono">{event.reason_code}: </span>}
                {event.reason_message}
              </div>
            )}
          </div>
        </div>
      ))}
      {events.length === 0 && (
        <div className="text-sm text-muted-foreground">No timeline events recorded.</div>
      )}
    </div>
  );
}
