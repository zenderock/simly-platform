"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Info, AlertTriangle, CheckCircle2, Bell, CheckCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Alert } from "@/types";

const severityConfig = {
  info: {
    icon: Info,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-500",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
    borderColor: "border-yellow-200 dark:border-yellow-800",
  },
  error: {
    icon: AlertCircle,
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950/20",
    borderColor: "border-red-200 dark:border-red-800",
  },
  success: {
    icon: CheckCircle2,
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    borderColor: "border-green-200 dark:border-green-800",
  },
};

export default function NotificationsPage() {
  const { organizationId } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/alerts`);
      setAlerts(response.data || []);
    } catch (error) {
      console.error("Failed to fetch alerts", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [organizationId]);

  const markAsRead = async (alertId: number) => {
    try {
      await api.post(`/alerts/${alertId}/read`);
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, is_read: true } : alert
        )
      );
    } catch (error) {
      console.error("Failed to mark alert as read", error);
    }
  };

  const markAllAsRead = async () => {
    const unreadAlerts = alerts.filter(alert => !alert.is_read);
    
    try {
      await Promise.all(
        unreadAlerts.map(alert => api.post(`/alerts/${alert.id}/read`))
      );
      setAlerts(prev => 
        prev.map(alert => ({ ...alert, is_read: true }))
      );
    } catch (error) {
      console.error("Failed to mark all alerts as read", error);
    }
  };

  const createTestAlert = async () => {
    try {
      await api.post('/alerts/test');
      // Refresh alerts after creating test alert
      fetchAlerts();
    } catch (error) {
      console.error("Failed to create test alert", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " at " + date.toLocaleTimeString();
  };

  const unreadCount = alerts.filter(alert => !alert.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with alerts and system notifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={createTestAlert} variant="secondary">
            Create Test Alert
          </Button>
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline">
              <CheckCheck className="size-4 mr-2" />
              Mark all as read ({unreadCount})
            </Button>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No notifications</h3>
            <p className="text-muted-foreground text-center">
              You're all caught up! Notifications will appear here when there are updates.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const config = severityConfig[alert.severity];
            const IconComponent = config.icon;
            
            return (
              <Card 
                key={alert.id} 
                className={cn(
                  "transition-all hover:shadow-md",
                  !alert.is_read && "ring-2 ring-primary/20",
                  config.borderColor,
                  "border-l-4"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg", config.bgColor)}>
                        <IconComponent className={cn("size-5", config.color)} />
                      </div>
                      <div className="space-y-1">
                        <CardTitle className="text-lg leading-tight">
                          {alert.title}
                          {!alert.is_read && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              New
                            </Badge>
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {alert.type}
                          </Badge>
                          <Badge 
                            variant={alert.severity === 'error' ? 'destructive' : 'secondary'}
                            className="text-xs capitalize"
                          >
                            {alert.severity}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {!alert.is_read && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => markAsRead(alert.id)}
                      >
                        Mark as read
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    {alert.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(alert.created_at)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}