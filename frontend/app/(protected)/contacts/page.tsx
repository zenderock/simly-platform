"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  listContacts,
  deleteContact,
  updateContact,
  Contact,
  listLists,
  createList,
  deleteList,
  getListDetails,
} from "@/lib/api/contacts";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CreateContactDialog } from "./create-contact-dialog";
import { ImportContactsDialog } from "./import-contacts-dialog";
import LoaderQuater from "@/components/loader";
import {
  IconPlus,
  IconUsers,
  IconDots,
  IconSearch,
  IconSquare,
  IconEdit,
  IconTrashX,
} from "@tabler/icons-react";

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedList, setSelectedList] = useState<number | null>(null); // null = All Contacts
  const [createListOpen, setCreateListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  // Edit form states
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTags, setEditTags] = useState("");

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

  const createListMutation = useMutation({
    mutationFn: createList,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-lists"] });
      setCreateListOpen(false);
      setNewListName("");
      setNewListDescription("");
      toast.success("List created");
    },
    onError: (err: any) => toast.error(getErrorMessage(err)),
  });

  const updateContactMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      updateContact(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["list-details"] });
      setEditingContact(null);
      toast.success("Contact updated successfully");
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleCreateList = () => {
    if (!newListName.trim()) {
      toast.error("List name is required");
      return;
    }
    createListMutation.mutate({
      name: newListName,
      description: newListDescription,
    });
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setEditFirstName(contact.first_name);
    setEditLastName(contact.last_name);
    setEditPhoneNumber(contact.phone_number);
    setEditEmail(contact.email);
    setEditTags(contact.tags?.join(", ") || "");
  };

  const handleUpdateContact = () => {
    if (!editingContact) return;

    if (!editFirstName.trim()) {
      toast.error("First name is required");
      return;
    }

    if (!editPhoneNumber.trim()) {
      toast.error("Phone number is required");
      return;
    }

    const updateData = {
      first_name: editFirstName.trim(),
      last_name: editLastName.trim(),
      phone_number: editPhoneNumber.trim(),
      email: editEmail.trim(),
      tags: editTags
        ? editTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    };

    updateContactMutation.mutate({ id: editingContact.id, data: updateData });
  };

  const contacts = selectedList === null ? allContacts : listDetails?.members;
  const contactsLoading =
    selectedList === null ? allContactsLoading : listDetailsLoading;

  // Client-side filtering on the currently active dataset
  const filteredContacts =
    contacts?.filter((c: Contact) => {
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
          <p className="text-sm text-muted-foreground">
            Manage your audience and campaigns
          </p>
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
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Lists
            </h3>
            <Dialog open={createListOpen} onOpenChange={setCreateListOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="size-6">
                  <IconPlus className="size-3" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New List</DialogTitle>
                  <DialogDescription>
                    Create a list to organize your contacts for campaigns.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="list-name">List Name</Label>
                    <Input
                      id="list-name"
                      placeholder="e.g. VIP Customers"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="list-description">
                      Description (optional)
                    </Label>
                    <Input
                      id="list-description"
                      placeholder="e.g. High-value customers for special offers"
                      value={newListDescription}
                      onChange={(e) => setNewListDescription(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateListOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateList}
                    disabled={createListMutation.isPending}
                  >
                    {createListMutation.isPending ? (
                      <LoaderQuater className="mr-2" />
                    ) : null}
                    Create List
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-col gap-1">
            <Button
              variant={selectedList === null ? "secondary" : "ghost"}
              className="justify-start font-normal"
              onClick={() => setSelectedList(null)}
            >
              <IconUsers className="mr-2 size-4" />
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
                  <span className="ml-auto text-xs text-muted-foreground">
                    {list.member_count || 0}
                  </span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <IconDots className="size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deleteListMutation.mutate(list.id)}
                    >
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
              <IconSearch className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
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
                      <IconSquare className="size-4" />
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
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No contacts found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContacts.map((contact: any) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <IconSquare className="size-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell className="font-medium">
                          {contact.first_name} {contact.last_name}
                        </TableCell>
                        <TableCell>{contact.phone_number}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {contact.email || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {contact.tags?.map((tag: any) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-[10px] px-1 py-0 h-5"
                              >
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
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                              >
                                <IconDots className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEditContact(contact)}
                              >
                                <IconEdit className="mr-2 size-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setContactToDelete(contact)}
                              >
                                <IconTrashX className="mr-2 size-4" />
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!contactToDelete}
        onOpenChange={() => setContactToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {contactToDelete?.first_name}{" "}
              {contactToDelete?.last_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (contactToDelete) {
                  deleteMutation.mutate(contactToDelete.id);
                  setContactToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Contact Dialog */}
      <Dialog
        open={!!editingContact}
        onOpenChange={() => setEditingContact(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update contact information for {editingContact?.first_name}{" "}
              {editingContact?.last_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-first-name">First Name</Label>
                <Input
                  id="edit-first-name"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-last-name">Last Name</Label>
                <Input
                  id="edit-last-name"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                value={editPhoneNumber}
                onChange={(e) => setEditPhoneNumber(e.target.value)}
                placeholder="+1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags</Label>
              <Input
                id="edit-tags"
                placeholder="vip, customer, newsletter"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingContact(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateContact}
              disabled={updateContactMutation.isPending}
            >
              {updateContactMutation.isPending && (
                <LoaderQuater className="mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
