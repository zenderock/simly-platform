"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
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
  ChartLine,
  MoreHorizontal,
  Download,
  Share2,
  Maximize2,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from "recharts";
import { useDashboardStore } from "@/store/dashboard-store";
import { useApplicationStore } from "@/store/application-store";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { toPng } from "html-to-image";
import { toast } from "sonner";

export function LeadSourcesChart() {
  const triggerRefresh = useDashboardStore((state) => state.triggerRefresh);
  const activeAppId = useApplicationStore((state) => state.activeAppId);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const chartRef = useRef<HTMLDivElement>(null);

  const { data: stats } = useDashboardStats(activeAppId);

  const sent = stats?.sent_messages || 0;
  const delivered = stats?.delivered_messages || 0;
  const failed = stats?.failed_messages || 0;
  const pending = stats?.pending_messages || 0;

  const data = [
    { name: "Sent", value: sent, color: "#35b9e9" },
    { name: "Delivered", value: delivered, color: "#8c52ff" },
    { name: "Failed", value: failed, color: "#e255f2" },
    { name: "Pending", value: pending, color: "#375dfb" },
  ];

  const totalLeads = data.reduce((acc, item) => acc + item.value, 0);

  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  const handleExport = async () => {
    if (chartRef.current === null) return;

    try {
      const dataUrl = await toPng(chartRef.current, {
        backgroundColor: "white",
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = "message-status-chart.png";
      link.href = dataUrl;
      link.click();
      toast.success("Chart exported as PNG");
    } catch (err) {
      console.error("oops, something went wrong!", err);
      toast.error("Failed to export chart");
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: "Simly Message Status",
      text: `Check out our message statistics: ${totalLeads} total messages.`,
      url: window.location.href,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard");
      }
    } catch (err) {
      console.error("Error sharing", err);
      toast.error("Could not share link");
    }
  };

  const handleFullscreen = () => {
    if (chartRef.current === null) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      chartRef.current.requestFullscreen().catch((err) => {
        toast.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    }
  };

  const renderActiveShape = (props: unknown) => {
    const typedProps = props as {
      cx: number;
      cy: number;
      innerRadius: number;
      outerRadius: number;
      startAngle: number;
      endAngle: number;
      fill: string;
    };
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } =
      typedProps;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
  };

  return (
    <div
      ref={chartRef}
      className="flex flex-col gap-4 p-4 sm:p-6 rounded-xl border bg-card w-full h-full transition-all duration-300 [&:fullscreen]:p-8 sm:[&:fullscreen]:p-12 [&:fullscreen]:bg-background [&:fullscreen]:overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Button variant="outline" size="icon" className="size-7 sm:size-8">
            <ChartLine className="size-4 sm:size-[18px] text-muted-foreground" />
          </Button>
          <span className="text-sm sm:text-base font-medium">
            Message Status
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7 sm:size-8">
              <MoreHorizontal className="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[180px]">
            <DropdownMenuLabel>Display Options</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={showLabels}
              onCheckedChange={setShowLabels}
            >
              Show labels
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExport}>
              <Download className="size-4 mr-2" />
              Export as PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="size-4 mr-2" />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleFullscreen}>
              <Maximize2 className="size-4 mr-2" />
              Full Screen
            </DropdownMenuItem>
            <DropdownMenuItem onClick={triggerRefresh}>
              <RefreshCw className="size-4 mr-2" />
              Refresh Data
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        <div className="relative shrink-0 size-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="42%"
                outerRadius="70%"
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
                activeIndex={activeIndex !== null ? activeIndex : undefined}
                activeShape={renderActiveShape}
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-lg sm:text-xl font-semibold">
              {totalLeads.toLocaleString()}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              Total Messages
            </span>
          </div>
        </div>

        {showLabels && (
          <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-1 gap-2 sm:gap-4">
            {data.map((item, index) => (
              <div
                key={item.name}
                className={`flex items-center gap-2 sm:gap-2.5 cursor-pointer transition-opacity ${
                  activeIndex !== null && activeIndex !== index
                    ? "opacity-50"
                    : ""
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <div
                  className="w-1 h-4 sm:h-5 rounded-sm shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="flex-1 text-xs sm:text-sm text-muted-foreground">
                  {item.name}
                </span>
                <span className="text-xs sm:text-sm font-semibold tabular-nums">
                  {item.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Settings2 className="size-3" />
        <span>Live Data</span>
      </div>
    </div>
  );
}
