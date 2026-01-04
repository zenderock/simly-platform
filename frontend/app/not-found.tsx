"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IconMoodSad } from "@tabler/icons-react";

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center space-y-4 text-center">
      <div className="bg-muted rounded-full p-4">
        <IconMoodSad className="h-10 w-10 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">
          404 - Page Not Found
        </h1>
        <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It
          might have been moved or deleted.
        </p>
      </div>
      <div className="flex gap-4">
        <Button asChild onClick={() => window.history.back()} variant="outline">
          <Link href="#">Go Back</Link>
        </Button>
        <Button asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
