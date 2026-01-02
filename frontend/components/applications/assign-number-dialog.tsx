'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface AssignNumberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssign: (didNumber: string, description: string) => void
}

export function AssignNumberDialog({ open, onOpenChange, onAssign }: AssignNumberDialogProps) {
  const [didNumber, setDidNumber] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!didNumber.trim()) {
      return
    }

    setLoading(true)
    try {
      await onAssign(didNumber.trim(), description.trim())
      setDidNumber('')
      setDescription('')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setDidNumber('')
      setDescription('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Phone Number</DialogTitle>
          <DialogDescription>
            Enter a physical phone number from one of your devices to route incoming SMS to this application.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="didNumber">Phone Number</Label>
            <Input
              id="didNumber"
              placeholder="+237691443051"
              value={didNumber}
              onChange={(e) => setDidNumber(e.target.value)}
              disabled={loading}
              required
            />
            <p className="text-sm text-muted-foreground">
              Enter the full phone number including country code (e.g., +237691443051)
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="e.g., Main customer support line"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !didNumber.trim()}>
              {loading ? 'Assigning...' : 'Assign Number'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}