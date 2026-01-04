"use client";

import { useEffect } from "react";
import { Poppins } from "next/font/google";
import { Button } from "@/components/ui/button";
import "./globals.css";

const poppinsSans = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className={`${poppinsSans.variable} antialiased`}>
        <div className="flex min-h-screen flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl text-destructive">
              Something went wrong!
            </h1>
            <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed">
              A critical error occurred. Please try again later.
            </p>
          </div>
          <Button onClick={() => reset()}>Try again</Button>
        </div>
      </body>
    </html>
  );
}
