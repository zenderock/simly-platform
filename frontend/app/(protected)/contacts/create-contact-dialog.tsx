"use client";

import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { toast } from "sonner";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { createContact, listLists, addContactsToList } from "@/lib/api/contacts";
import { PhoneInput } from "@/components/ui/phone-input";
import LoaderQuater from "@/components/loader";
import { IconPlus } from "@tabler/icons-react";

const schema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().optional(),
  phone_number: z.string().min(5, "Valid phone number is required"),
  email: z.string().email().optional().or(z.literal("")),
  tags: z.string().optional(), // Comma separated
  list_id: z.string().optional(), // Contact list to add to
});

type FormData = z.infer<typeof schema>;

interface CreateContactDialogProps {
  onOpenChange?: (open: boolean) => void;
}

export function CreateContactDialog({ onOpenChange }: CreateContactDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch contact lists
  const { data: contactLists = [] } = useQuery({
    queryKey: ["contact-lists"],
    queryFn: listLists,
    enabled: open, // Only fetch when dialog is open
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: "",
      last_name: "",
      phone_number: "",
      email: "",
      tags: "",
      list_id: "",
    },
  });

  const mutation = useMutation({
    mutationFn: createContact,
    onSuccess: async (contact) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      
      // If a list was selected, add the contact to that list
      const selectedListId = form.getValues("list_id");
      if (selectedListId && selectedListId !== "") {
        try {
          await addContactsToList(parseInt(selectedListId), [contact.id]);
          queryClient.invalidateQueries({ queryKey: ["contact-lists"] });
          toast.success(`Contact created and added to list successfully`);
        } catch (error) {
          toast.success("Contact created successfully");
          toast.error("Failed to add contact to list");
        }
      } else {
        toast.success("Contact created successfully");
      }
      
      setOpen(false);
      form.reset();
      onOpenChange?.(false);
    },
    onError: (error: any) => {
      // Extract error message from backend response
      const errorMessage = error.response?.data || error.message || "Failed to create contact";
      toast.error(errorMessage);
      console.error(error);
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      first_name: data.first_name,
      last_name: data.last_name || "",
      phone_number: data.phone_number,
      email: data.email || "",
      tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <IconPlus className="mr-2 size-4" />
          Add Contact
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
          <DialogDescription>
            Create a new contact in your audience.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <PhoneInput 
                        value={field.value}
                        onValueChange={field.onChange}
                        id="phone"
                        required
                        defaultCountry="FR"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="john@example.com" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input placeholder="vip, customer, newsletter" {...field} />
                  </FormControl>
                  <FormDescription>Comma separated tags</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="list_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Add to List (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a list" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No list</SelectItem>
                      {contactLists.map((list) => (
                        <SelectItem key={list.id} value={list.id.toString()}>
                          {list.name} ({list.member_count || 0} members)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Automatically add this contact to a specific list
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <LoaderQuater className="mr-2" />}
                Create Contact
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
