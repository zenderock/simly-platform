"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Info, AlertTriangle, CheckCircle2, Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert } from "@/types";
import LoaderQuater from "@/components/loader";
import { 
  useNotifications, 
  useMarkAsRead, 
  useMarkAllAsRead, 
  useCreateTestAlert 
} from "@/hooks/use-notifications";

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
  const { data: alerts = [], isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const createTestAlert = useCreateTestAlert();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " at " + date.toLocaleTimeString();
  };

  const unreadCount = alerts.filter((alert: Alert) => !alert.is_read).length;
  const unreadIds = alerts.filter((alert: Alert) => !alert.is_read).map((a: Alert) => a.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoaderQuater />
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
          <Button 
            onClick={() => createTestAlert.mutate()} 
            variant="secondary"
            disabled={createTestAlert.isPending}
          >
            Create Test Alert
          </Button>
          {unreadCount > 0 && (
            <Button 
              onClick={() => markAllAsRead.mutate(unreadIds)} 
              variant="outline"
              disabled={markAllAsRead.isPending}
            >
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
          {alerts.map((alert: Alert) => {
            const config = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.info;
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
                        onClick={() => markAsRead.mutate(alert.id)}
                        disabled={markAsRead.isPending}
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
