"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listCampaigns,
  deleteCampaign,
  launchCampaign,
} from "@/lib/api/campaigns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";
import LoaderQuater from "@/components/loader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  IconPlus,
  IconDots,
  IconPlayerPlay,
  IconEye,
  IconTrash,
  IconSpeakerphone,
} from "@tabler/icons-react";
import { useState } from "react";

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: listCampaigns,
    refetchInterval: 10000, // Refetch every 10s to track processing campaigns
    refetchIntervalInBackground: false,
    staleTime: 5000,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign deleted");
      setDeleteId(null);
    },
    onError: (err: any) => {
      toast.error("Failed to delete campaign");
      setDeleteId(null);
    },
  });

  const launchMutation = useMutation({
    mutationFn: launchCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign launched successfully");
    },
    onError: (err: any) => {
      toast.error(
        "Failed to launch campaign: " + (err.response?.data || err.message)
      );
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "scheduled":
        return <Badge variant="outline">Scheduled</Badge>;
      case "processing":
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600">Processing</Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>
        );
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Manage and track your SMS campaigns
          </p>
        </div>
        <Link href="/campaigns/create">
          <Button>
            <IconPlus className="mr-2 size-4" />
            Create Campaign
          </Button>
        </Link>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <LoaderQuater className="mx-auto" />
                  </TableCell>
                </TableRow>
              ) : campaigns?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No campaigns found. Create your first campaign to get
                    started.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns?.map((campaign) => {
                  const formattedCampaignId = `sy-c-${String(
                    campaign.id
                  ).padStart(2, "0")}-${campaign.id}`;
                  return (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/campaigns/${formattedCampaignId}`}
                          className="hover:underline flex items-center gap-2"
                        >
                          <IconSpeakerphone className="size-4 text-muted-foreground" />
                          {campaign.name}
                        </Link>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span className="font-mono text-xs bg-secondary/50 px-1.5 py-0.5 rounded">
                            {formattedCampaignId}
                          </span>
                          <span className="truncate max-w-[200px]">
                            {campaign.template_body}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span>
                              {campaign.sent_messages} /{" "}
                              {campaign.total_messages}
                            </span>
                            {campaign.total_messages > 0 && (
                              <span>
                                {Math.round(
                                  (campaign.sent_messages /
                                    campaign.total_messages) *
                                    100
                                )}
                                %
                              </span>
                            )}
                          </div>
                          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{
                                width: `${
                                  campaign.total_messages > 0
                                    ? (campaign.sent_messages /
                                        campaign.total_messages) *
                                      100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(campaign.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                            >
                              <IconDots className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {campaign.status === "draft" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  launchMutation.mutate(campaign.id)
                                }
                              >
                                <IconPlayerPlay className="mr-2 size-4" />
                                Launch Now
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/campaigns/${formattedCampaignId}`}
                                className="flex items-center"
                              >
                                <IconEye className="mr-2 size-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteId(campaign.id)}
                            >
                              <IconTrash className="mr-2 size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <AlertDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                campaign and remove it from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteId) deleteMutation.mutate(deleteId);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
