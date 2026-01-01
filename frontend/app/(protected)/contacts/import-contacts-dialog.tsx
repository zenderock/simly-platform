"use client";

import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileDown, Upload, Info } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { importContacts, listLists } from "@/lib/api/contacts";
import LoaderQuater from "@/components/loader";

const schema = z.object({
  file: z.any().refine((files) => files?.length > 0, "File is required"),
  list_id: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function ImportContactsDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: lists } = useQuery({
      queryKey: ["contact-lists"],
      queryFn: listLists
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      list_id: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: { file: File; listId?: number }) => importContacts(data.file, data.listId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact-lists"] });
      toast.success(`Successfully imported ${res.count} contacts`);
      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data || "Failed to import contacts");
      console.error(error);
    },
  });

  const onSubmit = (data: FormData) => {
    const file = data.file[0];
    mutation.mutate({
      file,
      listId: data.list_id ? parseInt(data.list_id) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileDown className="mr-2 size-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Contacts</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import contacts.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-muted/30 p-4 rounded-lg border border-dashed flex flex-col gap-2 mb-4">
            <h4 className="text-xs font-semibold flex items-center gap-2">
                <Info className="size-3" />
                CSV Format Requirements
            </h4>
            <ul className="text-[11px] text-muted-foreground list-disc pl-4 space-y-1">
                <li>Must contain a <span className="text-foreground font-medium">phone</span> column.</li>
                <li>Optional columns: <span className="text-foreground font-medium">first_name, last_name, email, tags</span>.</li>
                <li>Multiple tags should be comma-separated.</li>
            </ul>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="file"
              render={({ field: { value, onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>CSV File</FormLabel>
                  <FormControl>
                    <div className="grid w-full items-center gap-1.5">
                        <Input 
                            type="file" 
                            accept=".csv"
                            className="cursor-pointer"
                            onChange={(e) => onChange(e.target.files)}
                            {...field}
                         />
                    </div>
                  </FormControl>
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
                        <SelectItem value="0">None</SelectItem>
                        {lists?.map((list) => (
                            <SelectItem key={list.id} value={list.id.toString()}>
                                {list.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Optionally add imported contacts to an existing list.
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
                {mutation.isPending ? (
                    <>
                        <LoaderQuater className="mr-2" />
                        Importing...
                    </>
                ) : (
                    <>
                        <Upload className="mr-2 size-4" />
                        Import CSV
                    </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
