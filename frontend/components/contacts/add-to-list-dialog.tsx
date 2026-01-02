'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { listContacts, listLists, addContactsToList } from '@/lib/api/contacts'
import LoaderQuater from '@/components/loader'

interface AddToListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preSelectedContacts?: number[]
}

export function AddToListDialog({ open, onOpenChange, preSelectedContacts = [] }: AddToListDialogProps) {
  const [selectedListId, setSelectedListId] = useState<string>('')
  const [selectedContacts, setSelectedContacts] = useState<number[]>(preSelectedContacts)
  const queryClient = useQueryClient()

  // Fetch contacts and lists
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: listContacts,
    enabled: open,
  })

  const { data: contactLists = [], isLoading: listsLoading } = useQuery({
    queryKey: ['contact-lists'],
    queryFn: listLists,
    enabled: open,
  })

  const mutation = useMutation({
    mutationFn: ({ listId, contactIds }: { listId: number; contactIds: number[] }) =>
      addContactsToList(listId, contactIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] })
      toast.success(`${selectedContacts.length} contact(s) added to list successfully`)
      onOpenChange(false)
      setSelectedListId('')
      setSelectedContacts([])
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data || error.message || 'Failed to add contacts to list'
      toast.error(errorMessage)
    },
  })

  const handleContactToggle = (contactId: number) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  const handleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(contacts.map(c => c.id))
    }
  }

  const handleSubmit = () => {
    if (!selectedListId || selectedContacts.length === 0) {
      toast.error('Please select a list and at least one contact')
      return
    }

    mutation.mutate({
      listId: parseInt(selectedListId),
      contactIds: selectedContacts,
    })
  }

  const isLoading = contactsLoading || listsLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Contacts to List</DialogTitle>
          <DialogDescription>
            Select contacts and choose a list to add them to.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* List Selection */}
          <div className="space-y-2">
            <Label>Select List</Label>
            <Select value={selectedListId} onValueChange={setSelectedListId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a list" />
              </SelectTrigger>
              <SelectContent>
                {contactLists.map((list) => (
                  <SelectItem key={list.id} value={list.id.toString()}>
                    {list.name} ({list.member_count || 0} members)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contact Selection */}
          <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between">
              <Label>Select Contacts ({selectedContacts.length} selected)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={isLoading}
              >
                {selectedContacts.length === contacts.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoaderQuater />
              </div>
            ) : (
              <div className="border rounded-md overflow-y-auto flex-1 max-h-[300px]">
                <div className="p-4 space-y-3">
                  {contacts.map((contact) => (
                    <div key={contact.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={`contact-${contact.id}`}
                        checked={selectedContacts.includes(contact.id)}
                        onCheckedChange={() => handleContactToggle(contact.id)}
                      />
                      <label
                        htmlFor={`contact-${contact.id}`}
                        className="flex-1 cursor-pointer text-sm"
                      >
                        <div className="font-medium">
                          {contact.first_name} {contact.last_name}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {contact.phone_number}
                          {contact.email && ` • ${contact.email}`}
                        </div>
                      </label>
                    </div>
                  ))}
                  {contacts.length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      No contacts found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending || !selectedListId || selectedContacts.length === 0}
          >
            {mutation.isPending && <LoaderQuater className="mr-2" />}
            Add to List ({selectedContacts.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}