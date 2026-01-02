'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useApplicationStore } from '@/store/application-store'
import { IconPlus, IconSettings, IconPhone } from '@tabler/icons-react'

export default function ApplicationsPage() {
  const { applications, fetchApplications } = useApplicationStore()

  useEffect(() => {
    fetchApplications()
  }, [])

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-muted-foreground">
            Manage your applications and their phone number assignments
          </p>
        </div>
        <Button>
          <IconPlus className="h-4 w-4 mr-2" />
          New Application
        </Button>
      </div>

      {applications.length === 0 ? (
        <Card className="border-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <IconSettings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No applications found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first application to start managing SMS routing.
            </p>
            <Button>
              <IconPlus className="h-4 w-4 mr-2" />
              Create Application
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {applications.map((app) => (
            <Card key={app.id} className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{app.name}</CardTitle>
                  <Badge variant={app.is_sandbox ? 'secondary' : 'default'}>
                    {app.is_sandbox ? 'Sandbox' : 'Live'}
                  </Badge>
                </div>
                {app.description && (
                  <CardDescription>{app.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Created {new Date(app.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/applications/${app.id}/numbers`}>
                      <IconPhone className="h-4 w-4 mr-2" />
                      Numbers
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/applications/${app.id}/settings`}>
                      <IconSettings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}