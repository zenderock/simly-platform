"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { listLists } from "@/lib/api/contacts";
import { listDevices } from "@/lib/api/devices";
import { createCampaign, launchCampaign } from "@/lib/api/campaigns";
import LoaderQuater from "@/components/loader";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/utils";
import {
  IconArrowLeft,
  IconCheck,
  IconInfoSquareFilled,
  IconClock2,
  IconUsers,
  IconDeviceMobile,
  IconCalendarTime,
  IconRocket,
  IconArrowRight,
  IconRotateClockwise2,
} from "@tabler/icons-react";

const steps = [
  { id: 1, title: "Details" },
  { id: 2, title: "Target & Schedule" },
  { id: 3, title: "Review" },
];

const schema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  template_body: z.string().min(1, "Message template is required"),
  list_id: z.string().min(1, "Contact list is required"), // Select is string usually
  device_id: z.union([z.string(), z.number()]).transform((val) => {
    if (typeof val === "string") {
      return val === "auto" ? 0 : parseInt(val);
    }
    return val;
  }),
  sim_slot: z.string().optional(),
  scheduled_at: z.string().optional(),
  auto_reschedule: z.boolean().optional(),
});

type FormData = z.input<typeof schema>;

export default function CreateCampaignPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const isLaunchingRef = useRef(false);
  const { organizations, organizationId } = useAuth();
  const currentOrg = organizations.find((o) => o.id === organizationId);
  const isFreePlan = currentOrg?.plan === "free";

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      template_body: "",
      list_id: "",
      device_id: 0, // 0 for "auto"
      sim_slot: "auto",
      scheduled_at: "",
      auto_reschedule: false,
    },
    mode: "onChange",
  });

  const scheduledAt = form.watch("scheduled_at");
  const isScheduled = !!scheduledAt;

  // Fetch Data
  const { data: lists } = useQuery({
    queryKey: ["contact-lists"],
    queryFn: listLists,
  });
  const { data: devices } = useQuery({
    queryKey: ["devices"],
    queryFn: listDevices,
  });
  const { data: allContacts } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { listContacts } = await import("@/lib/api/contacts");
      return listContacts();
    },
  });

  // Create a virtual "All Contacts" list option
  const allContactsOption = {
    id: -1, // Special ID for all contacts
    name: "All Contacts",
    member_count: allContacts?.length || 0,
  };

  const listsWithAll = lists
    ? [allContactsOption, ...lists]
    : [allContactsOption];

  // ...

  const createMutation = useMutation({
    mutationFn: createCampaign,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });

      if (isLaunchingRef.current && !isScheduled) {
        toast.success("Campaign created and launched successfully!");
      } else if (isScheduled) {
        toast.success("Campaign scheduled successfully");
      } else {
        toast.success("Campaign draft created");
      }
      router.push("/campaigns");
    },
    onError: (error: any) => {
      const msg = getErrorMessage(error);
      toast.error(msg);
    },
  });

  const nextStep = async () => {
    // Validate current step fields
    let valid = false;
    if (currentStep === 1) {
      valid = await form.trigger(["name", "template_body"]);
    } else if (currentStep === 2) {
      valid = await form.trigger(["list_id", "device_id", "scheduled_at"]);
    }

    if (valid) setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => setCurrentStep((prev) => prev - 1);

  const onSubmit = (data: FormData) => {
    const listId = parseInt(data.list_id);
    let formattedScheduledAt = undefined;

    if (data.scheduled_at) {
      // Input datetime-local gives YYYY-MM-DDTHH:mm
      // We create a Date object which assumes local time (browser)
      // and then format it to ISO (UTC) for the backend
      const date = new Date(data.scheduled_at);
      formattedScheduledAt = date.toISOString();
    }

    const isAutoDevice = data.device_id === 0;

    createMutation.mutate({
      name: data.name,
      template_body: data.template_body,
      list_id: listId === -1 ? null : listId, // null means all contacts
      device_id: isAutoDevice ? null : (data.device_id as number),
      use_all_devices: isAutoDevice,
      sim_slot:
        data.sim_slot === "auto" ? null : parseInt(data.sim_slot || "0"),
      scheduled_at: formattedScheduledAt,
      auto_launch: isLaunchingRef.current && !formattedScheduledAt,
      auto_reschedule: data.auto_reschedule,
    });
  };

  const selectedList = listsWithAll.find(
    (l) => l.id.toString() === form.watch("list_id")
  );
  const selectedDevice = devices?.find((d) => d.id === form.watch("device_id"));

  return (
    <div className="flex flex-col h-full bg-muted/10">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <IconArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Create Campaign</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex items-center gap-2">
                  <span
                    className={`flex size-5 items-center justify-center rounded-full text-[10px] border ${
                      currentStep === step.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : currentStep > step.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-muted-foreground"
                    }`}
                  >
                    {currentStep > step.id ? (
                      <IconCheck className="size-3" />
                    ) : (
                      step.id
                    )}
                  </span>
                  <span
                    className={
                      currentStep === step.id
                        ? "font-medium text-foreground"
                        : ""
                    }
                  >
                    {step.title}
                  </span>
                  {idx < steps.length - 1 && (
                    <div className="h-px w-4 bg-border" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Step 1: Details */}
              {currentStep === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Campaign Details</CardTitle>
                    <CardDescription>
                      Give your campaign a name and draft your message.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Campaign Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Summer Sale Promo"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="template_body"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message Template</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Hello {{first_name}}, check out our new offer!"
                              className="min-h-[150px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Available variables:{" "}
                            <code className="bg-muted px-1 rounded">
                              {"{{first_name}}"}
                            </code>
                            ,{" "}
                            <code className="bg-muted px-1 rounded">
                              {"{{last_name}}"}
                            </code>
                            ,{" "}
                            <code className="bg-muted px-1 rounded">
                              {"{{phone}}"}
                            </code>
                          </FormDescription>
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <div>
                              {isFreePlan && (
                                <div className="flex items-center gap-1.5 text-[#8c52ff] dark:text-blue-400 font-medium">
                                  <IconInfoSquareFilled className="size-3" />
                                  Branding will be added (+17 chars)
                                </div>
                              )}
                            </div>
                            <div>
                              {field.value.length} characters •{" "}
                              {Math.ceil(field.value.length / 160)} SMS
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>Configuration</CardTitle>
                  <CardDescription>
                    Define who receives the message and how it should be sent.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Section 1: Targeting */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Targeting
                    </h3>
                    <FormField
                      control={form.control}
                      name="list_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact List</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a contact list" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {listsWithAll.map((list) => (
                                <SelectItem
                                  key={list.id}
                                  value={list.id.toString()}
                                >
                                  <div className="flex items-center justify-between w-full min-w-[200px]">
                                    <span>{list.name}</span>
                                    <span className="text-xs text-muted-foreground ml-2">
                                      ({list.member_count} contacts)
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Section 2: Device Strategy */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Sending Strategy
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="device_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sending Device</FormLabel>
                            <Select
                              onValueChange={(val) => {
                                if (val === "auto") {
                                  form.setValue("device_id", 0); // 0 for Auto
                                } else {
                                  form.setValue("device_id", parseInt(val));
                                }
                              }}
                              value={
                                form.watch("device_id") === 0
                                  ? "auto"
                                  : form.watch("device_id")?.toString()
                              }
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a device" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="auto">
                                  Automatic (Smart Dispatch)
                                </SelectItem>
                                {devices?.map((device) => {
                                  const phoneNumbers = device.sim_cards
                                    ?.map((s: any) => s.phone_number)
                                    .filter(Boolean)
                                    .join(", ");

                                  const isDisabled =
                                    device.status !== "online" ||
                                    device.requires_setup;

                                  return (
                                    <SelectItem
                                      key={device.id}
                                      value={device.id.toString()}
                                      disabled={isDisabled}
                                    >
                                      <div className="flex items-center">
                                        <div
                                          className={`size-2 rounded-full mr-2 ${
                                            device.status === "online" &&
                                            !device.requires_setup
                                              ? "bg-green-500"
                                              : "bg-gray-300"
                                          }`}
                                        />
                                        <span>{device.name}</span>
                                        {device.requires_setup && (
                                          <span className="text-xs text-red-500 ml-2 font-medium">
                                            (Requires Setup)
                                          </span>
                                        )}
                                        {phoneNumbers &&
                                          !device.requires_setup && (
                                            <span className="text-xs text-muted-foreground ml-2">
                                              ({phoneNumbers})
                                            </span>
                                          )}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Best for load balancing multiple SIMs.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="sim_slot"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SIM Preference</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Automatic Selection" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="auto">
                                  Automatic (Best Signal/Quota)
                                </SelectItem>
                                <SelectItem value="0">SIM Slot 1</SelectItem>
                                <SelectItem value="1">SIM Slot 2</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Leave 'Automatic' to optimize delivery rates.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Section 3: Schedule & Limits */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Timing & Limits
                    </h3>

                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="scheduled_at"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Schedule Start (Optional)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <IconCalendarTime className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                  type="datetime-local"
                                  className="pl-9"
                                  placeholder="Select date and time"
                                  {...field}
                                  min={new Date().toISOString().slice(0, 16)}
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Leave blank to start sending immediately.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-muted/40">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Smart Reschedule
                          </FormLabel>
                          <FormDescription className="text-xs max-w-[300px]">
                            Automatically pause and resume the campaign tomorrow
                            if a SIM card reaches its daily operator limit.
                          </FormDescription>
                        </div>
                        <FormField
                          control={form.control}
                          name="auto_reschedule"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              ){/* Step 3: Review */}
              {currentStep === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Review Campaign</CardTitle>
                    <CardDescription>
                      Double check everything before launching.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-md bg-muted/50">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                          <IconUsers className="size-4" />
                          <span className="text-sm font-medium">
                            Target List
                          </span>
                        </div>
                        <div className="font-semibold">
                          {selectedList?.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {selectedList?.member_count} contacts
                        </div>
                      </div>
                      <div className="p-4 border rounded-md bg-muted/50">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                          <IconDeviceMobile className="size-4" />
                          <span className="text-sm font-medium">
                            Using Device
                          </span>
                        </div>
                        <div className="font-semibold">
                          {form.getValues("device_id") === 0
                            ? "Automatic (Smart Dispatch)"
                            : selectedDevice?.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {form.getValues("device_id") === 0
                            ? `${
                                devices?.filter((d) => d.status === "online")
                                  .length
                              } device(s) available`
                            : selectedDevice?.sim_cards
                                ?.map((s: any) => s.phone_number)
                                .filter(Boolean)
                                .join(", ")}
                        </div>
                      </div>
                    </div>

                    {/* Estimation Card */}
                    <div className="p-4 rounded-md border border-indigo-100 bg-indigo-50/50 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                      <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 mb-2">
                        <IconRotateClockwise2 className="size-4" />
                        <span className="text-sm font-bold">
                          Estimated Duration
                        </span>
                      </div>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-black tabular-nums">
                          {(() => {
                            const totalMessages =
                              selectedList?.member_count || 0;
                            // Typical Android limit or safe throughput per min
                            const msgsPerMinPerDevice = 20;
                            const activeDeviceCount =
                              form.getValues("device_id") === 0
                                ? devices?.filter((d) => d.status === "online")
                                    .length || 1
                                : 1;

                            const totalMsgsPerMin =
                              msgsPerMinPerDevice * activeDeviceCount;
                            const minutes = Math.ceil(
                              totalMessages / (totalMsgsPerMin || 1)
                            );

                            if (minutes < 60) return `≈ ${minutes} mins`;
                            const hours = Math.floor(minutes / 60);
                            const mins = minutes % 60;
                            return `≈ ${hours}h ${mins}m`;
                          })()}
                        </span>
                        <span className="text-x text-muted-foreground mb-1">
                          at max speed
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 opacity-80">
                        Based on available devices and safe sending limits.
                        Actual time may vary depending on network conditions.
                      </p>
                    </div>

                    {scheduledAt && (
                      <div className="p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 rounded-md">
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-1">
                          <IconCalendarTime className="size-4" />
                          <span className="text-sm font-medium">
                            Scheduled for
                          </span>
                        </div>
                        <div className="font-semibold text-lg">
                          {new Date(scheduledAt).toLocaleString(undefined, {
                            dateStyle: "full",
                            timeStyle: "short",
                          })}
                        </div>
                        <div className="text-xs text-[#8c52ff]/80 dark:text-blue-400/80 mt-1">
                          This campaign will automatically start at this time.
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        Message Preview
                      </h4>
                      <div className="p-4 border rounded-md bg-white dark:bg-zinc-900 text-sm whitespace-pre-wrap">
                        {form.getValues("template_body")}
                      </div>
                    </div>

                    <Separator />

                    <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-md border border-blue-100 dark:border-blue-900 flex gap-3">
                      <IconRocket className="size-5 text-[#8c52ff] shrink-0" />
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        You are about to{" "}
                        {isScheduled ? (
                          <strong>schedule</strong>
                        ) : (
                          <strong>launch</strong>
                        )}{" "}
                        messaging for{" "}
                        <strong>{selectedList?.member_count} contacts</strong>.
                        Depending on your device connection, this might take
                        some time to process. Make sure your Android device is
                        charged and has a stable internet connection.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Footer Buttons */}
              <div className="flex items-center justify-between">
                {currentStep > 1 ? (
                  <Button type="button" variant="outline" onClick={prevStep}>
                    <IconArrowLeft className="mr-2 size-4" /> Back
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                )}

                {currentStep < 3 ? (
                  <Button type="button" onClick={nextStep}>
                    Next <IconArrowRight className="ml-2 size-4" />
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={createMutation.isPending}
                      onClick={() => (isLaunchingRef.current = false)}
                    >
                      Save Draft
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      onClick={() => (isLaunchingRef.current = true)}
                      className="bg-[#8c52ff] hover:bg-[#8c52ff]/80 text-white"
                    >
                      {createMutation.isPending && (
                        <LoaderQuater className="mr-2" />
                      )}
                      {isScheduled ? "Schedule Campaign" : "Launch Campaign"}
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
