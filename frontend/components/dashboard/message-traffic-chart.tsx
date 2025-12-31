"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";
import {
  BarChart2,
  MoreHorizontal,
  BarChart3,
  LineChartIcon,
  TrendingUp,
  Calendar,
  Grid3X3,
  RefreshCw,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import api from "@/lib/api";
import { TrafficStat } from "@/types";
import { useDashboardStore } from "@/store/dashboard-store";

type ChartType = "bar" | "line" | "area";
type TimePeriod = "7days" | "30days" | "90days";

const periodLabels: Record<TimePeriod, string> = {
  "7days": "Last 7 Days",
  "30days": "Last 30 Days",
  "90days": "Last 90 Days",
};

const periodDays: Record<TimePeriod, number> = {
  "7days": 7,
  "30days": 30,
  "90days": 90,
};

function CustomTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const count = payload[0].value || 0;

  return (
    <div className="bg-popover border border-border rounded-lg p-2 sm:p-3 shadow-lg">
      <p className="text-xs sm:text-sm font-medium text-foreground mb-1.5 sm:mb-2">{label}</p>
      <div className="space-y-1 sm:space-y-1.5">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div
            className="size-2 sm:size-2.5 rounded-full"
            style={{ background: "#6e3ff3" }}
          />
          <span className="text-[10px] sm:text-sm text-muted-foreground">Messages:</span>
          <span className="text-[10px] sm:text-sm font-medium text-foreground">
            {Number(count).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

import { useApplicationStore } from "@/store/application-store";

export function MessageTrafficChart() {
  const refreshKey = useDashboardStore((state) => state.refreshKey);
  const activeAppId = useApplicationStore((state) => state.activeAppId);
  const { resolvedTheme } = useTheme();
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [period, setPeriod] = useState<TimePeriod>("30days");
  const [showGrid, setShowGrid] = useState(true);
  const [smoothCurve, setSmoothCurve] = useState(true);
  const [data, setData] = useState<TrafficStat[]>([]);

  const isDark = resolvedTheme === "dark";
  const axisColor = isDark ? "#71717a" : "#a1a1aa";
  const gridColor = isDark ? "#27272a" : "#f4f4f5";

  useEffect(() => {
    const fetchTraffic = async () => {
      try {
        const days = periodDays[period];
        let url = `/dashboard/traffic?days=${days}`;
        if (activeAppId) {
          url += `&application_id=${activeAppId}`;
        }
        const res = await api.get<TrafficStat[]>(url); 
        setData(res.data || []);
      } catch (error) {
        console.error("Failed to fetch traffic stats", error);
      }
    };
    fetchTraffic();
  }, [period, refreshKey, activeAppId]);

  const totalMessages = data.reduce((acc, item) => acc + item.count, 0);

  return (
    <div className="flex-1 flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 rounded-xl border bg-card min-w-0 h-full">
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-2.5 flex-1">
          <Button variant="outline" size="icon" className="size-7 sm:size-8">
            <BarChart2 className="size-4 sm:size-[18px] text-muted-foreground" />
          </Button>
          <span className="text-sm sm:text-base font-medium">Message Traffic</span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7 sm:size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Chart Options</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <BarChart3 className="size-4 mr-2" />
                Chart Type
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setChartType("bar")}>
                  <BarChart3 className="size-4 mr-2" />
                  Bar Chart
                  {chartType === "bar" && <Check className="size-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setChartType("line")}>
                  <LineChartIcon className="size-4 mr-2" />
                  Line Chart
                  {chartType === "line" && <Check className="size-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setChartType("area")}>
                  <TrendingUp className="size-4 mr-2" />
                  Area Chart
                  {chartType === "area" && <Check className="size-4 ml-auto" />}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Calendar className="size-4 mr-2" />
                Time Period
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {(Object.keys(periodLabels) as TimePeriod[]).map((key) => (
                  <DropdownMenuItem key={key} onClick={() => setPeriod(key)}>
                    {periodLabels[key]}
                    {period === key && <Check className="size-4 ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            <DropdownMenuCheckboxItem
              checked={showGrid}
              onCheckedChange={setShowGrid}
            >
              <Grid3X3 className="size-4 mr-2" />
              Show Grid Lines
            </DropdownMenuCheckboxItem>

            {(chartType === "line" || chartType === "area") && (
              <DropdownMenuCheckboxItem
                checked={smoothCurve}
                onCheckedChange={setSmoothCurve}
              >
                <TrendingUp className="size-4 mr-2" />
                Smooth Curve
              </DropdownMenuCheckboxItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => {
                setChartType("bar");
                setPeriod("30days");
                setShowGrid(true);
                setSmoothCurve(true);
              }}
            >
              <RefreshCw className="size-4 mr-2" />
              Reset to Default
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-10 flex-1 min-h-0">
        <div className="flex flex-col gap-4 w-full lg:w-[200px] xl:w-[220px] shrink-0">
          <div className="space-y-2 sm:space-y-4">
            <p className="text-xl sm:text-2xl lg:text-[28px] font-semibold leading-tight tracking-tight">
              {totalMessages.toLocaleString()}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Total Messages ({periodLabels[period]})
            </p>
          </div>
        </div>

        <div className="flex-1 h-[180px] sm:h-[200px] lg:h-[240px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <BarChart data={data} barGap={2}>
                {showGrid && (
                  <CartesianGrid
                    strokeDasharray="0"
                    stroke={gridColor}
                    vertical={false}
                  />
                )}
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: axisColor, fontSize: 10 }}
                  dy={8}
                  tickFormatter={(val) => val.split("-").slice(1).join("/")}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: axisColor, fontSize: 10 }}
                  dx={-5}
                  width={40}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: isDark ? "#27272a" : "#f4f4f5", radius: 4 }}
                />
                <Bar
                  dataKey="count"
                  fill="#6e3ff3"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            ) : chartType === "line" ? (
              <LineChart data={data}>
                {showGrid && (
                  <CartesianGrid
                    strokeDasharray="0"
                    stroke={gridColor}
                    vertical={false}
                  />
                )}
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: axisColor, fontSize: 10 }}
                  dy={8}
                  tickFormatter={(val) => val.split("-").slice(1).join("/")}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: axisColor, fontSize: 10 }}
                  dx={-5}
                  width={40}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: isDark ? "#52525b" : "#d4d4d8" }}
                />
                <Line
                  type={smoothCurve ? "monotone" : "linear"}
                  dataKey="count"
                  stroke="#6e3ff3"
                  strokeWidth={2}
                  dot={{ fill: "#6e3ff3", strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: "#6e3ff3" }}
                />
              </LineChart>
            ) : (
              <AreaChart data={data}>
                {showGrid && (
                  <CartesianGrid
                    strokeDasharray="0"
                    stroke={gridColor}
                    vertical={false}
                  />
                )}
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: axisColor, fontSize: 10 }}
                  dy={8}
                  tickFormatter={(val) => val.split("-").slice(1).join("/")}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: axisColor, fontSize: 10 }}
                  dx={-5}
                  width={40}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: isDark ? "#52525b" : "#d4d4d8" }}
                />
                <Area
                  type={smoothCurve ? "monotone" : "linear"}
                  dataKey="count"
                  stroke="#6e3ff3"
                  strokeWidth={2}
                  fill="#6e3ff3"
                  fillOpacity={0.1}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
