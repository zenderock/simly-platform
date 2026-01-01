"use client";

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
  Trash2
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Organization } from "@/types";
import Link from "next/link";
import api from "@/lib/api";
import LoaderQuater from "@/components/loader";

interface OrganizationStats {
  messages_today: number;
  messages_this_month: number;
  active_devices: number;
  total_devices: number;
  success_rate: number;
}

export default function OrganizationPage() {
  const { organizationId, organizations } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
  });

  const fetchOrganizationData = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      const [orgResponse, statsResponse] = await Promise.all([
        api.get('/organizations/current'),
        api.get('/organizations/current/stats')
      ]);
      
      setOrganization(orgResponse.data);
      setStats(statsResponse.data);
      setFormData({
        name: orgResponse.data.name,
      });
    } catch (error) {
      console.error("Failed to fetch organization data", error);
      // Fallback to organizations from auth store
      const activeOrg = organizations.find(org => org.id === organizationId);
      if (activeOrg) {
        setOrganization(activeOrg);
        setFormData({
          name: activeOrg.name,
        });
      }
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
      await api.put('/organizations/current', formData);
      // Refresh data after successful update
      await fetchOrganizationData();
    } catch (error) {
      console.error("Failed to update organization", error);
    } finally {
      setSaving(false);
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
            <h3 className="text-lg font-semibold mb-2">No organization selected</h3>
            <p className="text-muted-foreground text-center">
              Please select an organization from the header to manage its settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const usagePercentage = organization.sms_monthly_limit > 0 
    ? Math.round(((stats?.messages_this_month || 0) / organization.sms_monthly_limit) * 100)
    : 0;

  const deviceUsagePercentage = organization.max_devices > 0
    ? Math.round(((stats?.active_devices || 0) / organization.max_devices) * 100)
    : 0;

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
          <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1">
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
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter organization name"
                />
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
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
                        {stats?.messages_this_month?.toLocaleString() || 0} / {organization.sms_monthly_limit.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all" 
                        style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Burst Limit: {organization.sms_burst_limit.toLocaleString()}</span>
                      <span>{usagePercentage}% used</span>
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
                        {stats?.active_devices || 0} / {organization.max_devices}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all" 
                        style={{ width: `${Math.min(deviceUsagePercentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>SIMs per Device: {organization.max_sims_per_device}</span>
                      <span>{deviceUsagePercentage}% used</span>
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
                <span className="text-sm font-medium">{formatDate(organization.created_at)}</span>
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
                  <span className="font-medium">{stats?.messages_today || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Active devices</span>
                  <span className="font-medium">{stats?.active_devices || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Success rate</span>
                  <span className={`font-medium ${(stats?.success_rate || 0) >= 95 ? 'text-green-600' : 'text-yellow-600'}`}>
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
              <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive">
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