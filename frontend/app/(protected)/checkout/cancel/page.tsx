"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function CheckoutCancelPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md text-center"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <div className="rounded-full bg-orange-500/10 p-4">
            <XCircle className="w-12 h-12 text-orange-500" strokeWidth={1} />
          </div>
        </motion.div>

        <h1 className="text-3xl font-semibold mb-4 tracking-tight text-foreground">
          Payment Canceled
        </h1>
        <p className="text-muted-foreground mb-12 text-balance leading-relaxed">
          The operation was canceled. No charges were made to your account. You
          can try again whenever you are ready.
        </p>

        <div className="flex flex-col gap-3">
          <Button
            asChild
            size="lg"
            className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 transition-all rounded-none ring-offset-background font-medium"
          >
            <Link href="/organization/plans">
              <ArrowLeft className="mr-2 w-4 h-4" /> Back to Plans
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="w-full h-12 hover:bg-accent transition-all rounded-none font-medium"
          >
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
