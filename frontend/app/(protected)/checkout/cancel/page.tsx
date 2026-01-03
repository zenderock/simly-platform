"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function CheckoutCancelPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 text-center border-border/50 shadow-sm">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.1,
            }}
            className="flex justify-center mb-6"
          >
            <div className="rounded-full bg-orange-500/10 p-4">
              <XCircle
                className="w-16 h-16 text-orange-500"
                strokeWidth={1.5}
              />
            </div>
          </motion.div>

          <h1 className="text-2xl font-semibold mb-2 tracking-tight">
            Payment Canceled
          </h1>
          <p className="text-muted-foreground mb-8">
            The operation was canceled. No charges were made to your account.
            You can try again whenever you are ready.
          </p>

          <div className="flex flex-col gap-3">
            <Button asChild size="lg" className="w-full font-medium">
              <Link href="/organization/plans">
                <ArrowLeft className="mr-2 w-4 h-4" /> Back to Plans
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="w-full">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
