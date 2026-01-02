"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { getCampaign, getCampaignAnalytics } from "@/lib/api/campaigns";
import { listDevices } from "@/lib/api/devices";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { 
    ArrowLeft, 
    BarChart3, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    RefreshCw,
    Share2,
    Calendar,
    Megaphone
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
    PieChart, 
    Pie, 
    Cell, 
    ResponsiveContainer, 
    Tooltip, 
    Legend 
} from "recharts";
import LoaderQuater from "@/components/loader";
import { format } from "date-fns";

export default function CampaignDetailsPage() {
  const params = useParams();
  const id = parseInt(params.id as string);
  const router = useRouter();

  // Generate formatted campaign ID
  const formattedCampaignId = `sy-c-${String(id).padStart(2, '0')}-${id}`;

  const { data: campaign, isLoading: isLoadingCampaign } = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => getCampaign(id),
  });

  const { data: analytics, isLoading: isLoadingAnalytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ["campaign-analytics", id],
    queryFn: () => getCampaignAnalytics(id),
    refetchInterval: campaign?.status === "processing" ? 5000 : false, // Poll if processing
  });

  // Fetch devices to get device name
  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: listDevices,
    enabled: !!campaign?.device_id, // Only fetch if campaign has a device_id
  });

  // Find device name
  const deviceName = campaign?.device_id 
    ? devices.find(d => d.id === campaign.device_id)?.name || `Device ${campaign.device_id}`
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
    { name: "Delivered", value: analytics.delivered, color: "var(--color-success)" },
    { name: "Failed", value: analytics.failed, color: "var(--color-danger)" },
    { name: "Pending", value: analytics.pending, color: "var(--color-warning)" },
  ].filter(d => d.value > 0);

  // If no delivered/failed/pending yet (e.g. just started), show Sent as baseline
  if (chartData.length === 0 && analytics.sent > 0) {
      chartData.push({ name: "Sent (Sent to devices)", value: analytics.sent, color: "var(--color-primary)" });
  }

  const COLORS = chartData.map(d => d.color);

  const getStatusBadge = (status: string) => {
    switch(status) {
        case 'draft': return <Badge variant="secondary">Draft</Badge>;
        case 'scheduled': return <Badge variant="outline">Scheduled</Badge>;
        case 'processing': return <Badge className="bg-blue-500 hover:bg-blue-600">Processing</Badge>;
        case 'completed': return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
        case 'failed': return <Badge variant="destructive">Failed</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="flex items-center justify-between border-b px-6 py-4 bg-background sticky top-0 z-10">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="size-4" />
            </Button>
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold">{campaign.name}</h1>
                    {getStatusBadge(campaign.status)}
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="size-3" />
                    {formattedCampaignId} • Created {format(new Date(campaign.created_at), "MMM d, yyyy HH:mm")}
                </p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchAnalytics()}>
                <RefreshCw className="mr-2 size-4" />
                Refresh
            </Button>
            {/* Future action buttons like Export PDF could go here */}
        </div>
      </div>

      <div className="p-6 grid gap-6 grid-cols-1 md:grid-cols-3">
        {/* Key Stats */}
        <Card className="md:col-span-1 shadow-none">
            <CardHeader pb-0>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="size-4 text-muted-foreground" />
                    Delivery Summary
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] mt-4">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                        <Clock className="size-12 mb-2 opacity-20" />
                        No delivery data yet
                    </div>
                )}
            </CardContent>
        </Card>

        {/* Breakdown Cards */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="shadow-none">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Messages</p>
                            <h2 className="text-2xl font-bold">{analytics.total}</h2>
                        </div>
                        <div className="p-2 bg-primary/10 rounded-full">
                            <Megaphone className="size-5 text-primary" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-none">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Successfully Sent</p>
                            <h2 className="text-2xl font-bold">{analytics.sent}</h2>
                        </div>
                        <div className="p-2 bg-success/10 rounded-full">
                            <Share2 className="size-5 text-success" />
                        </div>
                    </div>
                    <div className="mt-4 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-success" 
                            style={{ width: `${analytics.total > 0 ? (analytics.sent / analytics.total) * 100 : 0}%` }}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-none">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Delivered</p>
                            <h2 className="text-2xl font-bold">{analytics.delivered}</h2>
                        </div>
                        <div className="p-2 bg-success/10 rounded-full">
                            <CheckCircle2 className="size-5 text-success" />
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        {analytics.sent > 0 ? Math.round((analytics.delivered / analytics.sent) * 100) : 0}% of sent messages
                    </p>
                </CardContent>
            </Card>

            <Card className="shadow-none">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Failed</p>
                            <h2 className="text-2xl font-bold">{analytics.failed}</h2>
                        </div>
                        <div className="p-2 bg-danger/10 rounded-full">
                            <XCircle className="size-5 text-danger" />
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        {analytics.total > 0 ? Math.round((analytics.failed / analytics.total) * 100) : 0}% failure rate
                    </p>
                </CardContent>
            </Card>
        </div>

        {/* Campaign Info */}
        <Card className="md:col-span-3 shadow-none">
            <CardHeader>
                <CardTitle>Campaign Configuration</CardTitle>
                <CardDescription>Details of the template and target audience</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-sm font-semibold mb-2">Message Template</h4>
                            <div className="p-4 rounded-lg bg-secondary/50 border text-sm whitespace-pre-wrap min-h-[100px]">
                                {campaign.template_body}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-semibold mb-1">Targeting</h4>
                                <p className="text-sm text-muted-foreground">
                                    List ID: <span className="text-foreground font-medium">{campaign.list_id || "N/A"}</span>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Preferred Device: <span className="text-foreground font-medium">{deviceName || "Any available"}</span>
                                </p>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold mb-1">Schedule</h4>
                                <p className="text-sm text-muted-foreground">
                                    {campaign.scheduled_at 
                                        ? format(new Date(campaign.scheduled_at), "MMM d, yyyy HH:mm") 
                                        : "Instant Launch"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
