"use client";

import { getErrorMessage } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import {
  Building2,
  Crown,
  Activity,
  Zap,
  Globe,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Organization } from "@/types";
import Link from "next/link";
import api from "@/lib/api";
import LoaderQuater from "@/components/loader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface OrganizationStats {
  messages_today: number;
  messages_this_month: number;
  active_devices: number;
  total_devices: number;
  success_rate: number;
}

interface DispatchSettings {
  sms_throttle_rate_seconds: number;
  send_window_start: number;
  send_window_end: number;
  send_window_timezone: string;
}

export default function OrganizationPage() {
  const { organizationId, organizations } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [dispatchSettings, setDispatchSettings] = useState<DispatchSettings>({
    sms_throttle_rate_seconds: 1,
    send_window_start: 8,
    send_window_end: 21,
    send_window_timezone: "UTC",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDispatch, setSavingDispatch] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
  });

  const fetchOrganizationData = async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      const fetchOrg = api
        .get("/organizations/current")
        .then((res) => {
          setOrganization(res.data);
          setFormData({ name: res.data.name });
        })
        .catch((err) => {
          console.error("Failed to fetch organization", err);
          const activeOrg = organizations.find(
            (org) => org.id === organizationId
          );
          if (activeOrg) {
            setOrganization(activeOrg);
            setFormData({ name: activeOrg.name });
          }
        });

      const fetchStats = api
        .get("/organizations/current/stats")
        .then((res) => setStats(res.data))
        .catch((err) => console.error("Failed to fetch stats", err));

      const fetchDispatch = api
        .get("/organizations/current/dispatch-settings")
        .then((res) => {
          if (res.data) {
            setDispatchSettings(res.data);
          }
        })
        .catch((err) =>
          console.error("Failed to fetch dispatch settings", err)
        );

      await Promise.all([fetchOrg, fetchStats, fetchDispatch]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizationData();
  }, [organizationId]);

  const handleSave = async () => {
    if (!organizationId) return;

    setSaving(true);
    try {
      await api.put("/organizations/current", formData);
      toast.success("Organization details updated successfully");
      await fetchOrganizationData();
    } catch (error) {
      console.error("Failed to update organization", error);
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDispatch = async () => {
    if (!organizationId) return;

    setSavingDispatch(true);
    try {
      await api.put(
        "/organizations/current/dispatch-settings",
        dispatchSettings
      );
      toast.success("Dispatch settings updated successfully");
      await fetchOrganizationData();
    } catch (error) {
      console.error("Failed to update dispatch settings", error);
      toast.error(getErrorMessage(error));
    } finally {
      setSavingDispatch(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoaderQuater />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="p-12 max-w-2xl mx-auto border border-border mt-12 flex flex-col items-center text-center space-y-6">
        <Building2 className="size-12 text-muted-foreground" strokeWidth={1} />
        <h3 className="text-2xl font-light tracking-tight uppercase">
          Workspace Unavailable
        </h3>
        <p className="text-muted-foreground font-mono text-sm max-w-sm">
          Please select an active workspace from the global header to access configuration and metrology data.
        </p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  const usagePercentage =
    organization.sms_monthly_limit > 0
      ? Math.round(
        ((stats?.messages_this_month || 0) / organization.sms_monthly_limit) *
        100
      )
      : 0;

  const deviceUsagePercentage =
    organization.max_devices > 0
      ? Math.round(
        ((stats?.active_devices || 0) / organization.max_devices) * 100
      )
      : 0;

  const hours = Array.from({ length: 24 }, (_, i) => ({
    value: i.toString(),
    label: `${i.toString().padStart(2, "0")}:00`,
  }));

  const commonTimezones = [
    "UTC",
    "Europe/Paris",
    "Europe/London",
    "America/New_York",
    "America/Los_Angeles",
    "Asia/Tokyo",
    "Asia/Singapore",
    "Australia/Sydney",
  ];

  return (
    <div className="min-h-screen pb-24">
      {/* Structural Top Border */}
      <div className="h-[2px] w-full bg-foreground" />

      <div className="p-6 md:p-12 max-w-[1600px] mx-auto space-y-16">

        {/* Massive Typographic Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-border pb-12">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-light tracking-tighter uppercase leading-[0.9] text-foreground">
              {organization.name}
            </h1>
            <div className="flex items-center gap-3 text-sm font-mono tracking-widest uppercase text-muted-foreground">
              <span className="size-2 bg-green-500 rounded-none animate-pulse" />
              Active Workspace Session
            </div>
          </div>

          <div className="flex flex-col items-end gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Current Plan</span>
              <Badge variant="outline" className="rounded-none border-foreground text-foreground uppercase tracking-widest px-4 py-1.5 text-xs font-normal">
                {organization.plan}
              </Badge>
            </div>
            <Button asChild variant="default" className="rounded-none uppercase tracking-widest text-xs h-10 px-8 hover:bg-foreground/90 transition-none">
              <Link href="/organization/plans">
                Review Plans <ArrowUpRight className="size-4 ml-2" />
              </Link>
            </Button>
          </div>
        </header>

        <main className="grid gap-12 lg:grid-cols-12">

          {/* Left Column: Settings (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-12">

            {/* Designation Block */}
            <section className="group">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-xs font-mono text-muted-foreground">01</span>
                <h2 className="text-xl uppercase tracking-widest font-light text-foreground">Identity Parameters</h2>
                <div className="h-[1px] flex-1 bg-border group-hover:bg-foreground/20 transition-colors" />
              </div>

              <div className="grid md:grid-cols-[1fr_auto] items-end gap-4">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Workspace Designation</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="rounded-none border-border bg-transparent text-lg font-light tracking-wide focus-visible:ring-1 focus-visible:ring-foreground focus-visible:border-foreground transition-none h-14"
                    placeholder="Enter designation"
                  />
                </div>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-none uppercase tracking-widest text-sm h-14 px-8 w-full md:w-auto transition-none"
                >
                  {saving ? "Processing..." : "Commit Update"}
                </Button>
              </div>
            </section>

            {/* Dispatch Configuration Block */}
            <section className="group relative">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-xs font-mono text-muted-foreground">02</span>
                <h2 className="text-xl uppercase tracking-widest font-light text-foreground">Dispatch Control</h2>
                <div className="h-[1px] flex-1 bg-border group-hover:bg-foreground/20 transition-colors" />
              </div>

              <div className="border border-border relative overflow-hidden bg-muted/10">

                {/* Free Plan Restrictor Overlay */}
                {organization.plan === "free" && (
                  <div className="absolute inset-0 z-10 bg-background/90 border border-border flex flex-col items-center justify-center p-8 text-center m-2">
                    <Crown className="size-8 mb-6 text-muted-foreground" strokeWidth={1} />
                    <h3 className="text-2xl font-light tracking-tight uppercase mb-3 text-foreground">Professional Feature</h3>
                    <p className="font-mono text-sm text-muted-foreground max-w-md mb-8 leading-relaxed">
                      Custom dispatch configurations, timezone adjustments, and throttle modifications are structurally restricted on the core plan.
                    </p>
                    <Button
                      asChild
                      variant="default"
                      className="rounded-none uppercase tracking-widest text-sm h-12 px-10 transition-none"
                    >
                      <Link href="/organization/plans">Unlock Logistics</Link>
                    </Button>
                  </div>
                )}

                <div className={`p-8 space-y-8 ${organization.plan === "free" ? 'opacity-20 pointer-events-none grayscale' : ''}`}>
                  <div className="grid gap-8 sm:grid-cols-2">
                    <div className="space-y-3">
                      <Label htmlFor="throttle" className="text-xs uppercase tracking-widest text-muted-foreground font-mono flex items-center gap-2">
                        <Zap className="size-3" /> Throttle Rate (SEC)
                      </Label>
                      <Input
                        id="throttle"
                        type="number"
                        min={1}
                        disabled={organization.plan === "free"}
                        value={dispatchSettings.sms_throttle_rate_seconds}
                        onChange={(e) =>
                          setDispatchSettings((prev) => ({
                            ...prev,
                            sms_throttle_rate_seconds:
                              parseInt(e.target.value) || 1,
                          }))
                        }
                        className="rounded-none border-border bg-transparent focus-visible:ring-1 focus-visible:ring-foreground transition-none font-mono text-lg h-12"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="timezone" className="text-xs uppercase tracking-widest text-muted-foreground font-mono flex items-center gap-2">
                        <Globe className="size-3" /> Operational Timezone
                      </Label>
                      <Select
                        disabled={organization.plan === "free"}
                        value={dispatchSettings.send_window_timezone}
                        onValueChange={(value) =>
                          setDispatchSettings((prev) => ({
                            ...prev,
                            send_window_timezone: value,
                          }))
                        }
                      >
                        <SelectTrigger className="rounded-none border-border bg-transparent focus:ring-1 focus:ring-foreground transition-none font-mono text-base h-12">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent className="rounded-none font-mono">
                          {commonTimezones.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {tz}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Transmission Start</Label>
                      <Select
                        disabled={organization.plan === "free"}
                        value={dispatchSettings.send_window_start.toString()}
                        onValueChange={(value) =>
                          setDispatchSettings((prev) => ({
                            ...prev,
                            send_window_start: parseInt(value),
                          }))
                        }
                      >
                        <SelectTrigger className="rounded-none border-border bg-transparent focus:ring-1 focus:ring-foreground transition-none font-mono text-base h-12">
                          <SelectValue placeholder="Start Time" />
                        </SelectTrigger>
                        <SelectContent className="rounded-none font-mono">
                          {hours.map((h) => (
                            <SelectItem key={h.value} value={h.value}>
                              {h.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Transmission Halt</Label>
                      <Select
                        disabled={organization.plan === "free"}
                        value={dispatchSettings.send_window_end.toString()}
                        onValueChange={(value) =>
                          setDispatchSettings((prev) => ({
                            ...prev,
                            send_window_end: parseInt(value),
                          }))
                        }
                      >
                        <SelectTrigger className="rounded-none border-border bg-transparent focus:ring-1 focus:ring-foreground transition-none font-mono text-base h-12">
                          <SelectValue placeholder="End Time" />
                        </SelectTrigger>
                        <SelectContent className="rounded-none font-mono">
                          {hours.map((h) => (
                            <SelectItem key={h.value} value={h.value}>
                              {h.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Info Notice */}
                  <div className="border-l-[3px] border-foreground pl-4 py-2 mt-8">
                    <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                      SYS_NOTICE: Messages queued outside the designated active window (
                      <span className="text-foreground font-medium">{dispatchSettings.send_window_start}:00 &mdash; {dispatchSettings.send_window_end}:00 {dispatchSettings.send_window_timezone}</span>)
                      are held in cold storage and injected automatically upon window initialization.
                    </p>
                  </div>

                  <div className="pt-4">
                    <Button
                      onClick={handleSaveDispatch}
                      disabled={savingDispatch || organization.plan === "free"}
                      variant="outline"
                      className="rounded-none border-foreground text-foreground hover:bg-foreground hover:text-background uppercase tracking-widest text-sm h-12 px-8 transition-colors"
                    >
                      {savingDispatch ? "Synchronizing..." : "Synchronize Logistics"}
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Metrology (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-8">

            {/* Dark Mono Block */}
            <section className="bg-foreground text-background p-8 lg:p-10 flex flex-col h-full justify-between gap-12">
              <div>
                <div className="flex items-center justify-between mb-12">
                  <h2 className="text-sm uppercase tracking-widest font-mono opacity-80 text-background">Metrology Data</h2>
                  <Activity className="size-5 opacity-50" />
                </div>

                <div className="space-y-12">
                  {/* SMS Metrology */}
                  <div className="space-y-5">
                    <div className="flex items-baseline justify-between border-b border-background/20 pb-3">
                      <span className="text-sm uppercase tracking-widest opacity-90 text-background">Cycle SMS Load</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-6xl font-light tracking-tighter tabular-nums leading-none">
                          {stats?.messages_this_month?.toLocaleString() || 0}
                        </span>
                        {organization.sms_monthly_limit > 0 && (
                          <span className="font-mono text-sm opacity-50 uppercase tracking-widest">
                            / {organization.sms_monthly_limit.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {organization.sms_monthly_limit > 0 ? (
                      <div className="space-y-2">
                        <div className="h-[2px] w-full bg-background/20 overflow-hidden">
                          <div
                            className="h-full bg-background transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between font-mono text-xs opacity-70 uppercase tracking-widest">
                          <span>VOL: {usagePercentage}% CAP</span>
                          <span>BURST MAX: {organization.sms_burst_limit.toLocaleString()}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="font-mono text-xs opacity-70 uppercase tracking-widest text-right">
                        UNRESTRICTED // PAY-PER-USE
                      </div>
                    )}
                  </div>

                  {/* Device Metrology */}
                  <div className="space-y-5">
                    <div className="flex items-baseline justify-between border-b border-background/20 pb-3">
                      <span className="text-sm uppercase tracking-widest opacity-90 text-background">Active Nodes</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-6xl font-light tracking-tighter tabular-nums leading-none">
                          {stats?.active_devices || 0}
                        </span>
                        {organization.max_devices > 0 && (
                          <span className="font-mono text-sm opacity-50 uppercase tracking-widest">
                            / {organization.max_devices}
                          </span>
                        )}
                        {organization.max_devices === -1 && (
                          <span className="font-mono text-sm opacity-50 uppercase tracking-widest">
                            / &infin;
                          </span>
                        )}
                      </div>
                    </div>
                    {organization.max_devices > 0 ? (
                      <div className="space-y-2">
                        <div className="h-[2px] w-full bg-background/20 overflow-hidden">
                          <div
                            className="h-full bg-background transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min(deviceUsagePercentage, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between font-mono text-xs opacity-70 uppercase tracking-widest">
                          <span>HW: {deviceUsagePercentage}% ALLOC</span>
                          <span>SIM/NODE RATIO: {organization.max_sims_per_device}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between font-mono text-xs opacity-70 uppercase tracking-widest mt-2">
                        <span>SIM/NODE: {organization.max_sims_per_device}</span>
                        <span>UNLIMITED HW</span>
                      </div>
                    )}
                  </div>

                  {/* Additional Stats Micro-Grid */}
                  <div className="grid grid-cols-2 gap-[2px] bg-background/20">
                    <div className="bg-foreground p-5 space-y-3">
                      <span className="block text-xs uppercase font-mono tracking-widest opacity-60">24H Volume</span>
                      <span className="block text-3xl tracking-tighter font-light tabular-nums">{stats?.messages_today || 0}</span>
                    </div>
                    <div className="bg-foreground p-5 space-y-3">
                      <span className="block text-xs uppercase font-mono tracking-widest opacity-60">Transmit SR</span>
                      <span className={`block text-3xl tracking-tighter font-light tabular-nums ${(stats?.success_rate || 0) >= 95 ? "text-background" : "text-amber-500"
                        }`}>
                        {stats?.success_rate?.toFixed(1) || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Meta Data Footer */}
              <div className="pt-12 mt-12 border-t border-background/20 font-mono text-[10px] md:text-xs uppercase tracking-widest flex justify-between opacity-50">
                <span>Created {formatDate(organization.created_at)}</span>
              </div>
            </section>

          </div>

        </main>
      </div>
    </div>
  );
}
