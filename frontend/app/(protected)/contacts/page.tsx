import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contacts - Simly",
  description: "Manage your contact lists and audience for SMS campaigns. Import, organize, and segment your contacts.",
};

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { 
  listContacts, 
  deleteContact, 
  Contact, 
  listLists,
  createList,
  deleteList,
  getListDetails,
  ContactList
} from "@/lib/api/contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Trash2, Users, MoreHorizontal, FileDown, CheckSquare, Square } from "lucide-react";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { CreateContactDialog } from "./create-contact-dialog";
import { ImportContactsDialog } from "./import-contacts-dialog";
import  LoaderQuater  from "@/components/loader";

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedList, setSelectedList] = useState<number | null>(null); // null = All Contacts

  // Queries
  const { data: allContacts, isLoading: allContactsLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: listContacts,
    enabled: selectedList === null,
    staleTime: 60000, // Contacts don't change often - 1 minute
  });

  const { data: listDetails, isLoading: listDetailsLoading } = useQuery({
    queryKey: ["list-details", selectedList],
    queryFn: () => getListDetails(selectedList!),
    enabled: selectedList !== null,
    staleTime: 60000,
  });

  const { data: lists, isLoading: listsLoading } = useQuery({
    queryKey: ["contact-lists"],
    queryFn: listLists,
    staleTime: 60000,
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["list-details"] });
      toast.success("Contact deleted");
    },
  });

   const deleteListMutation = useMutation({
    mutationFn: deleteList,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-lists"] });
      if (selectedList) setSelectedList(null);
      toast.success("List deleted");
    },
  });

  const contacts = selectedList === null ? allContacts : listDetails?.members;
  const contactsLoading = selectedList === null ? allContactsLoading : listDetailsLoading;


  // Client-side filtering on the currently active dataset
  const filteredContacts = contacts?.filter((c: Contact) => {
    const term = search.toLowerCase();
    return (
      c.first_name.toLowerCase().includes(term) ||
      c.last_name.toLowerCase().includes(term) ||
      c.phone_number.includes(term) ||
      c.email.toLowerCase().includes(term)
    );
  }) || [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">Contacts</h1>
          <p className="text-sm text-muted-foreground">Manage your audience and campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportContactsDialog />
          <CreateContactDialog onOpenChange={() => {}} />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Lists */}
        <div className="w-64 border-r bg-muted/10 p-4 flex flex-col gap-4">
           <div className="flex items-center justify-between mb-2">
             <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Lists</h3>
             <Button variant="ghost" size="icon" className="size-6">
               <Plus className="size-3" />
             </Button>
           </div>
           
           <div className="flex flex-col gap-1">
             <Button 
                variant={selectedList === null ? "secondary" : "ghost"} 
                className="justify-start font-normal"
                onClick={() => setSelectedList(null)}
             >
               <Users className="mr-2 size-4" />
               All Contacts
             </Button>
             
             {listsLoading && <LoaderQuater className="mx-auto my-2" />}
             
             {lists?.map((list: any) => (
               <div key={list.id} className="group flex items-center gap-1">
                 <Button 
                    variant={selectedList === list.id ? "secondary" : "ghost"} 
                    className="justify-start font-normal flex-1 truncate"
                    onClick={() => setSelectedList(list.id)}
                 >
                   <span className="truncate">{list.name}</span>
                   <span className="ml-auto text-xs text-muted-foreground">{list.member_count || 0}</span>
                 </Button>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="size-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteListMutation.mutate(list.id)}>
                        Delete List
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
               </div>
             ))}
           </div>
        </div>

        {/* Main Table */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
           <div className="flex items-center gap-4 mb-4">
             <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input 
                  placeholder="Search contacts..." 
                  className="pl-9" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
             </div>
           </div>

           <div className="flex-1 border rounded-md overflow-hidden flex flex-col">
              <div className="overflow-auto flex-1">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Square className="size-4" />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contactsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <LoaderQuater className="mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredContacts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          No contacts found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredContacts.map((contact: any) => (
                        <TableRow key={contact.id}>
                          <TableCell>
                            <Square className="size-4 text-muted-foreground" />
                          </TableCell>
                          <TableCell className="font-medium">
                            {contact.first_name} {contact.last_name}
                          </TableCell>
                          <TableCell>{contact.phone_number}</TableCell>
                          <TableCell className="text-muted-foreground">{contact.email || "-"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {contact.tags?.map((tag: any) => (
                                <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0 h-5">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                             {format(new Date(contact.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {}}>Edit</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(contact.id)}>
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
