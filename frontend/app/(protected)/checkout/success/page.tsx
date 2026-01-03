"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function CheckoutSuccessPage() {
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
            <div className="rounded-full bg-green-500/10 p-4">
              <CheckCircle2
                className="w-16 h-16 text-green-500"
                strokeWidth={1.5}
              />
            </div>
          </motion.div>

          <h1 className="text-2xl font-semibold mb-2 tracking-tight">
            Subscription Activated!
          </h1>
          <p className="text-muted-foreground mb-8">
            Congratulations! Your account has been successfully upgraded. You
            now have access to all professional features of Simly.
          </p>

          <div className="flex flex-col gap-3">
            <Button asChild size="lg" className="w-full font-medium">
              <Link href="/dashboard">
                Go to Dashboard <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href="/organization">View Billing</Link>
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
