"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import {
  getCampaign,
  getCampaignAnalytics,
  getCampaignMessages,
} from "@/lib/api/campaigns";
import { listDevices } from "@/lib/api/devices";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import LoaderQuater from "@/components/loader";
import { format } from "date-fns";
import {
  IconArrowLeft,
  IconCalendarFilled,
  IconRotateClockwise2,
  IconChartBar,
  IconClockHour10,
  IconSpeakerphone,
  IconCircleCheck,
  IconCircleX,
  IconShare3,
  IconDeviceMobile,
  IconUsers,
  IconClock,
  IconBolt,
  IconAlertCircle,
  IconSend,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

export default function CampaignDetailsPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const router = useRouter();

  // Extract numeric ID from formatted campaign ID (sy-c-00-1 -> 1)
  const extractIdFromFormatted = (formattedId: string): number => {
    const match = formattedId.match(/sy-c-\d+-(\d+)$/);
    return match ? parseInt(match[1]) : parseInt(formattedId);
  };

  const id = extractIdFromFormatted(campaignId);

  const { data: campaign, isLoading: isLoadingCampaign } = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => getCampaign(id),
  });

  const {
    data: analytics,
    isLoading: isLoadingAnalytics,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ["campaign-analytics", id],
    queryFn: () => getCampaignAnalytics(id),
    refetchInterval: campaign?.status === "processing" ? 5000 : false,
  });

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ["campaign-messages", id],
    queryFn: () => getCampaignMessages(id, 10), // Fetch last 10
    refetchInterval: campaign?.status === "processing" ? 3000 : false,
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: listDevices,
    enabled: !!campaign?.device_id,
  });

  const deviceName = campaign?.device_id
    ? devices.find((d) => d.id === campaign.device_id)?.name ||
      `Device ${campaign.device_id}`
    : null;

  if (isLoadingCampaign || isLoadingAnalytics) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoaderQuater />
      </div>
    );
  }

  if (!campaign || !analytics) return null;

  const chartData = [
    {
      name: "Delivered",
      value: analytics.delivered,
      color: "#10b981", // Success green
    },
    { name: "Failed", value: analytics.failed, color: "#ef4444" },
    {
      name: "Pending",
      value: analytics.pending,
      color: "#f59e0b", // Warning amber
    },
  ].filter((d) => d.value > 0);

  if (chartData.length === 0 && analytics.sent > 0) {
    chartData.push({
      name: "Sent",
      value: analytics.sent,
      color: "#6e3ff3",
    });
  }

  const COLORS = chartData.map((d) => d.color);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "scheduled":
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-500">
            Scheduled
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-[#6e3ff3] shadow-[0_0_15px_rgba(110,63,243,0.3)] animate-pulse">
            <IconBolt className="size-3 mr-1 fill-white" />
            Live Processing
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-emerald-500 hover:bg-emerald-600">
            Completed
          </Badge>
        );
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex h-full flex-col overflow-auto bg-zinc-50/50 dark:bg-zinc-950/50">
      {/* Premium Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full size-10 border-zinc-200 dark:border-zinc-800"
              onClick={() => router.back()}
            >
              <IconArrowLeft className="size-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">
                  {campaign.name}
                </h1>
                {getStatusBadge(campaign.status)}
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground font-medium">
                <span className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-xs font-mono">
                  sy-c-{String(id).padStart(2, "0")}-{id}
                </span>
                <span className="flex items-center gap-1">
                  <IconCalendarFilled className="size-3.5" />
                  {format(new Date(campaign.created_at), "MMM d, HH:mm")}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs font-semibold">
              <span
                className={`size-2 rounded-full ${
                  campaign.status === "processing"
                    ? "bg-blue-500 animate-ping"
                    : campaign.status === "completed"
                    ? "bg-green-500"
                    : "bg-zinc-400"
                }`}
              />
              {campaign.status.toUpperCase()}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 border-zinc-200 dark:border-zinc-800"
              onClick={() => {
                refetchAnalytics();
                toast.success("Metrics updated");
              }}
            >
              <IconRotateClockwise2 className="mr-2 size-4" />
              Sync Data
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Command Center Grid */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-4">
          {/* Main Visualization Card */}
          <Card className="lg:col-span-2 shadow-sm border-zinc-200 dark:border-zinc-800 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <IconChartBar size={120} />
            </div>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <IconBolt className="size-4 text-primary" />
                Performance Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-[300px]">
                <div className="h-full relative">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                              stroke="none"
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            backgroundColor: "rgba(0,0,0,0.8)",
                            color: "white",
                            backdropFilter: "blur(4px)",
                          }}
                          itemStyle={{ color: "white" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                      <IconClockHour10 className="size-16 mb-2 opacity-10" />
                      <p className="text-sm font-medium">
                        Awaiting Activity...
                      </p>
                    </div>
                  )}
                  {/* Central Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black tabular-nums">
                      {Math.round(
                        (analytics.sent / (analytics.total || 1)) * 100
                      )}
                      %
                    </span>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                      Progress
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border bg-secondary/20 space-y-1 hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground uppercase">
                        Campaign Goal
                      </span>
                      <IconUsers className="size-3 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-black tabular-nums">
                      {analytics.total}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      Total recipients in selection
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border bg-secondary/20 space-y-1 hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-primary">
                        Broadcast Activity
                      </span>
                      <IconBolt className="size-3 text-primary" />
                    </div>
                    <p className="text-2xl font-black tabular-nums text-primary">
                      {analytics.sent}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="h-1.5 flex-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${
                              (analytics.sent / (analytics.total || 1)) * 100
                            }%`,
                          }}
                          className="h-full bg-[#6e3ff3]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Stats Column */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <StatsCard
              title="Delivered"
              value={analytics.delivered}
              icon={<IconCircleCheck className="size-5" />}
              color="emerald"
              footer={
                analytics.delivered === 0 && analytics.sent > 0 ? (
                  <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full font-bold">
                    <IconAlertCircle className="size-3" /> Carrier dependent
                  </span>
                ) : (
                  `${Math.round(
                    (analytics.delivered / (analytics.sent || 1)) * 100
                  )}% delivery rate`
                )
              }
            />
            <StatsCard
              title="Processing / Pending"
              value={analytics.pending}
              icon={<IconClock className="size-5" />}
              color="amber"
              footer="Messages in gateway queue"
            />
            <StatsCard
              title="Failure Rate"
              value={analytics.failed}
              icon={<IconCircleX className="size-5" />}
              color="rose"
              footer={`${Math.round(
                (analytics.failed / (analytics.total || 1)) * 100
              )}% of total volume`}
            />
            <StatsCard
              title="Direct Success"
              value={analytics.sent}
              icon={<IconShare3 className="size-5" />}
              color="indigo"
              footer="Confirmed by gateways"
            />
          </div>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Recent Live Feed */}
          <Card className="lg:col-span-2 shadow-sm border-zinc-200 dark:border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  Live Dispatch Log
                </CardTitle>
                <CardDescription>
                  Real-time message status updates
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs h-8" asChild>
                <Link href={`/messages?campaign=${id}`}>View All Messages</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-zinc-50 dark:bg-zinc-900 border-b">
                    <TableRow>
                      <TableHead className="text-[10px] uppercase font-bold py-3">
                        Recipient
                      </TableHead>
                      <TableHead className="text-[10px] uppercase font-bold py-3">
                        Status
                      </TableHead>
                      <TableHead className="text-[10px] uppercase font-bold py-3">
                        Device
                      </TableHead>
                      <TableHead className="text-[10px] uppercase font-bold py-3 text-right">
                        Time
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingMessages ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center">
                          <LoaderQuater />
                        </TableCell>
                      </TableRow>
                    ) : messages.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="h-32 text-center text-muted-foreground text-sm"
                        >
                          No messages recorded in feed.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <AnimatePresence mode="popLayout">
                        {messages.map((msg: any) => (
                          <motion.tr
                            key={msg.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                          >
                            <TableCell className="py-3">
                              <span className="font-mono text-xs font-bold">
                                {msg.to}
                              </span>
                            </TableCell>
                            <TableCell className="py-3">
                              {renderMessageStatus(msg.status)}
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <IconDeviceMobile className="size-3" />
                                {msg.device_name || "Any"}
                              </div>
                            </TableCell>
                            <TableCell className="py-3 text-right">
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {format(new Date(msg.created_at), "HH:mm:ss")}
                              </span>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Configuration & Meta */}
          <div className="space-y-6">
            <Card className="shadow-sm border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                    <IconSend className="size-3" /> Message Template
                  </h4>
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {campaign.template_body}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <MetaItem
                    label="Target Audience"
                    value={
                      campaign.list_id
                        ? `List # ${campaign.list_id}`
                        : "All Contacts"
                    }
                    icon={<IconUsers className="size-4" />}
                  />
                  <MetaItem
                    label="Preferred Gateway"
                    value={deviceName || "Dynamic Allocation"}
                    icon={<IconDeviceMobile className="size-4" />}
                  />
                  <MetaItem
                    label="Launch Mode"
                    value={
                      campaign.scheduled_at
                        ? format(
                            new Date(campaign.scheduled_at),
                            "MMM d, HH:mm"
                          )
                        : "Instant Blast"
                    }
                    icon={<IconClock className="size-4" />}
                  />
                </div>
              </CardContent>
            </Card>

            {/* API Context */}
            {(campaign.status === "draft" ||
              campaign.status === "scheduled") && (
              <Card className="shadow-sm border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3">
                    Terminal Access
                  </h4>
                  <div className="bg-black rounded-lg p-3 font-mono text-[10px] text-zinc-400 select-all">
                    curl -X POST /v1/campaigns/{id}/launch \ <br />
                    -H "Authorization: Bearer sk_..."
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-2 h-auto p-0 text-xs text-primary font-bold hover:no-underline"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `curl -X POST https://api.simly.io/v1/campaigns/${id}/launch -H "Authorization: Bearer sk_live_..."`
                      );
                      toast.success("Command copied");
                    }}
                  >
                    Copy Launch Command
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon, color, footer }: any) {
  const colors: any = {
    emerald: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
    amber: "text-amber-500 bg-amber-50 dark:bg-amber-950/30",
    rose: "text-rose-500 bg-rose-50 dark:bg-rose-950/30",
    indigo: "text-[#6e3ff3] bg-[#6e3ff3]/10",
  };

  return (
    <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {title}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <h2 className="text-3xl font-black tabular-nums">{value}</h2>
        </div>
        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
          {footer}
        </div>
      </CardContent>
    </Card>
  );
}

function MetaItem({ label, value, icon }: any) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-muted-foreground">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          {label}
        </p>
        <p className="text-sm font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function renderMessageStatus(status: string) {
  switch (status) {
    case "sent":
      return (
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
          <IconShare3 className="size-3" />
          Sent
        </div>
      );
    case "delivered":
      return (
        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-500">
          <IconCircleCheck className="size-3" />
          Delivered
        </div>
      );
    case "failed":
      return (
        <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500">
          <IconCircleX className="size-3" />
          Failed
        </div>
      );
    case "pending":
      return (
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500 italic">
          <IconClock className="size-3" />
          Gateway Queue
        </div>
      );
    default:
      return (
        <div className="text-xs font-medium text-muted-foreground">
          {status}
        </div>
      );
  }
}
