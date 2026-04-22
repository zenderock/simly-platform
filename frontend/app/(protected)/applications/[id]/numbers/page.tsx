"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import api from "@/lib/api";
import { AssignNumberDialog } from "@/components/applications/assign-number-dialog";
import { IconPlus, IconPhone, IconTrash } from "@tabler/icons-react";

interface AppDID {
  id: number;
  application_id: number;
  did_number: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Application {
  id: number;
  name: string;
  description: string;
}

export default function ApplicationNumbersPage() {
  const params = useParams();
  const applicationId = parseInt(params.id as string);

  const [application, setApplication] = useState<Application | null>(null);
  const [numbers, setNumbers] = useState<AppDID[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  useEffect(() => {
    fetchApplication();
    fetchNumbers();
  }, [applicationId]);

  const fetchApplication = async () => {
    try {
      const response = await api.get<Application>(`/applications/${applicationId}`);
      setApplication(response.data);
    } catch (error) {
      console.error("Failed to fetch application:", error);
    }
  };

  const fetchNumbers = async () => {
    try {
      setLoading(true);
      const response = await api.get<AppDID[]>(`/applications/${applicationId}/dids`);
      setNumbers(response.data);
    } catch (error) {
      console.error("Failed to fetch numbers:", error);
      toast.error("Failed to load assigned numbers");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignNumber = async (didNumber: string, description: string) => {
    try {
      await api.post("/dids", {
        application_id: applicationId,
        did_number: didNumber,
        description: description,
      });

      toast.success("Number assigned successfully");
      fetchNumbers();
      setShowAssignDialog(false);
    } catch (error) {
      console.error("Failed to assign number:", error);
      toast.error(getErrorMessage(error));
    }
  };

  const handleUnassignNumber = async (didId: number) => {
    if (!confirm("Are you sure you want to unassign this number?")) {
      return;
    }

    try {
      await api.delete(`/dids/${didId}`);
      toast.success("Number unassigned successfully");
      fetchNumbers();
    } catch (error) {
      console.error("Failed to unassign number:", error);
      toast.error(getErrorMessage(error));
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Phone Numbers</h1>
          <p className="text-muted-foreground">
            Assign physical phone numbers to {application?.name} for incoming
            SMS routing
          </p>
        </div>
        <Button onClick={() => setShowAssignDialog(true)}>
          <IconPlus className="h-4 w-4 mr-2" />
          Assign Number
        </Button>
      </div>

      {numbers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <IconPhone className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No numbers assigned</h3>
            <p className="text-muted-foreground text-center mb-4">
              Assign physical phone numbers from your devices to route incoming
              SMS to this application.
            </p>
            <Button onClick={() => setShowAssignDialog(true)}>
              <IconPlus className="h-4 w-4 mr-2" />
              Assign First Number
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {numbers.map((number) => (
            <Card key={number.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center space-x-3">
                  <IconPhone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-lg">
                      {number.did_number}
                    </CardTitle>
                    {number.description && (
                      <CardDescription>{number.description}</CardDescription>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={number.is_active ? "default" : "secondary"}>
                    {number.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnassignNumber(number.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Assigned on {new Date(number.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AssignNumberDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        onAssign={handleAssignNumber}
      />
    </div>
  );
}
