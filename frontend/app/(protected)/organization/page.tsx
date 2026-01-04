"use client";

import { getErrorMessage } from "@/lib/utils";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
  Building2,
  Save,
  Crown,
  MessageSquare,
  Smartphone,
  Calendar,
  ExternalLink,
  Users,
  Key,
  Download,
  Trash2,
  Clock,
  Zap,
  Globe,
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
      // Fetch data independently to allow partial loading
      const fetchOrg = api
        .get("/organizations/current")
        .then((res) => {
          setOrganization(res.data);
          setFormData({ name: res.data.name });
        })
        .catch((err) => {
          console.error("Failed to fetch organization", err);
          // Fallback to auth store
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
      // Refresh data after successful update
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
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No organization selected
            </h3>
            <p className="text-muted-foreground text-center">
              Please select an organization from the header to manage its
              settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
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

  // Generate hours for select
  const hours = Array.from({ length: 24 }, (_, i) => ({
    value: i.toString(),
    label: `${i.toString().padStart(2, "0")}:00`,
  }));

  // Standard timezones
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
    <div className="space-y-8 p-6 max-w-9xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{organization.name}</h1>
              <p className="text-muted-foreground">Organization Settings</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className="flex items-center gap-2 px-3 py-1"
          >
            <Crown className="size-3" />
            {organization.plan} Plan
          </Badge>
          <Button asChild variant="outline">
            <Link href="/organization/plans">
              <ExternalLink className="size-4 mr-2" />
              View Plans
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Enter organization name"
                />
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto"
              >
                {saving ? (
                  <>
                    <LoaderQuater className="size-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="size-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Dispatch Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-primary" />
                <CardTitle>Dispatch Configuration</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 relative">
              {organization.plan === "free" && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg">
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] rounded-lg" />
                  <div className="relative z-20 text-center space-y-4 p-6 bg-background/95 rounded-xl shadow-sm border max-w-sm mx-4">
                    <div className="p-3 bg-amber-500/10 rounded-full w-fit mx-auto">
                      <Crown className="size-8 text-amber-500" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">
                        Advanced Scheduling
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Upgrade to the Professional plan to configure custom
                        send windows, timezones, and throttle rates.
                      </p>
                    </div>
                    <Button
                      asChild
                      className="w-full bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
                    >
                      <Link href="/organization/plans">Upgrade to Pro</Link>
                    </Button>
                  </div>
                </div>
              )}

              <div
                className={
                  organization.plan === "free"
                    ? "opacity-40 pointer-events-none select-none filter blur-[1px]"
                    : ""
                }
              >
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="throttle"
                      className="flex items-center gap-2"
                    >
                      <Zap className="size-4 text-amber-500" />
                      Throttle Rate (seconds)
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
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum delay between SMS sent from the same SIM
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="timezone"
                      className="flex items-center gap-2"
                    >
                      <Globe className="size-4 text-blue-500" />
                      Timezone
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
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {commonTimezones.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Send Window Start</Label>
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
                      <SelectTrigger>
                        <SelectValue placeholder="Start Time" />
                      </SelectTrigger>
                      <SelectContent>
                        {hours.map((h) => (
                          <SelectItem key={h.value} value={h.value}>
                            {h.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Send Window End</Label>
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
                      <SelectTrigger>
                        <SelectValue placeholder="End Time" />
                      </SelectTrigger>
                      <SelectContent>
                        {hours.map((h) => (
                          <SelectItem key={h.value} value={h.value}>
                            {h.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground mt-6">
                  <p>
                    Messages scheduled outside of the sending window (
                    {dispatchSettings.send_window_start}:00 -{" "}
                    {dispatchSettings.send_window_end}:00{" "}
                    {dispatchSettings.send_window_timezone}) will be queued and
                    sent automatically when the window opens.
                  </p>
                </div>

                <Button
                  onClick={handleSaveDispatch}
                  disabled={savingDispatch || organization.plan === "free"}
                  className="w-full sm:w-auto mt-6"
                >
                  {savingDispatch ? (
                    <>
                      <LoaderQuater className="size-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="size-4 mr-2" />
                      Update Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Usage Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Current Usage & Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-5 text-blue-500" />
                    <span className="font-medium">SMS Messages</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>This Month</span>
                      <span className="font-medium">
                        {stats?.messages_this_month?.toLocaleString() || 0}
                        {organization.sms_monthly_limit > 0
                          ? ` / ${organization.sms_monthly_limit.toLocaleString()}`
                          : ""}
                      </span>
                    </div>
                    {organization.sms_monthly_limit > 0 && (
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(usagePercentage, 100)}%`,
                          }}
                        />
                      </div>
                    )}
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        Burst Limit:{" "}
                        {organization.sms_burst_limit.toLocaleString()}
                      </span>
                      {organization.sms_monthly_limit > 0 ? (
                        <span>{usagePercentage}% used</span>
                      ) : (
                        <span className="text-xs uppercase tracking-wider font-semibold text-blue-600 dark:text-blue-400">
                          Pay-per-use
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="size-5 text-green-500" />
                    <span className="font-medium">Devices</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Active Devices</span>
                      <span className="font-medium">
                        {stats?.active_devices || 0} /{" "}
                        {organization.max_devices === -1
                          ? "∞"
                          : organization.max_devices}
                      </span>
                    </div>
                    {organization.max_devices > 0 && (
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(deviceUsagePercentage, 100)}%`,
                          }}
                        />
                      </div>
                    )}
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        SIMs per Device: {organization.max_sims_per_device}
                      </span>
                      {organization.max_devices > 0 ? (
                        <span>{deviceUsagePercentage}% used</span>
                      ) : (
                        <span className="text-xs uppercase tracking-wider font-semibold text-green-600 dark:text-green-400">
                          Unlimited
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Organization Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Organization Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-muted-foreground" />
                  <span className="text-sm">Created</span>
                </div>
                <span className="text-sm font-medium">
                  {formatDate(organization.created_at)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="size-4 text-muted-foreground" />
                  <span className="text-sm">Plan</span>
                </div>
                <Badge variant="outline">{organization.plan}</Badge>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Messages today</span>
                  <span className="font-medium">
                    {stats?.messages_today || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Active devices</span>
                  <span className="font-medium">
                    {stats?.active_devices || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Success rate</span>
                  <span
                    className={`font-medium ${
                      (stats?.success_rate || 0) >= 95
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {stats?.success_rate?.toFixed(1) || 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Organization Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Organization Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Users className="size-4 mr-2" />
                Invite Team Members
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Key className="size-4 mr-2" />
                Generate API Key
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Download className="size-4 mr-2" />
                Export Data
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4 mr-2" />
                Delete Organization
              </Button>
            </CardContent>
          </Card>

          {/* Plan Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Plan Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="size-2 bg-green-500 rounded-full" />
                  <span>SMS API Access</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-2 bg-green-500 rounded-full" />
                  <span>Webhook Support</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-2 bg-green-500 rounded-full" />
                  <span>Real-time Monitoring</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-2 bg-green-500 rounded-full" />
                  <span>24/7 Support</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
