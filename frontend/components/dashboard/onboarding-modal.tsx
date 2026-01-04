"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/store/dashboard-store";
import { ConnectDeviceContent } from "@/components/devices/connect-device-content";
import { NewMessageForm } from "@/components/dashboard/new-message-form";
import { ArrowRight, Check, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { DashboardStats } from "@/types";
import confetti from "canvas-confetti";

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<
    "welcome" | "connect" | "message" | "complete"
  >("welcome");
  const refreshKey = useDashboardStore((state) => state.refreshKey);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Check stats to determine if onboarding is needed
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get<DashboardStats>("/dashboard/stats");
        setStats(res.data);

        // Open if 0 devices
        if (res.data.total_devices === 0) {
          setOpen(true);
          setStep("welcome");
        }
        // If has devices but no messages (optional logic, for now simple check)
        else if (res.data.total_devices > 0 && step === "welcome") {
          // If user already added a device outside this modal but modal was looking at 'welcome', maybe advance?
          // But for now let's just use the modal flow.
          setOpen(false);
        }
      } catch (error) {
        console.error("Failed to check stats for onboarding", error);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [refreshKey]);

  // If user closes modal but hasn't finished, what happens?
  // We force it open if devices == 0 ?
  // Let's allow closing for now but it will reappear on refresh if condition meets.

  const handleConnectSuccess = () => {
    setStep("message");
  };

  const handleMessageSuccess = () => {
    setStep("complete");
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const handleComplete = () => {
    setOpen(false);
  };

  if (loading) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
      }}
    >
      <DialogContent className="max-w-[98vw] h-[95vh] w-[98vw] p-0 gap-0 overflow-hidden border-none shadow-2xl bg-background/95 backdrop-blur-md">
        <div className="flex flex-col h-full w-full relative">
          {/* Header / Progress */}
          <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10 pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto">
              <motion.div
                layout
                className={`h-2.5 rounded-full transition-colors ${
                  step === "welcome"
                    ? "bg-primary w-12"
                    : "bg-primary/30 w-8 hover:bg-primary/50"
                }`}
              />
              <motion.div
                layout
                className={`h-2.5 rounded-full transition-colors ${
                  step === "connect"
                    ? "bg-primary w-12"
                    : "bg-primary/30 w-8 hover:bg-primary/50"
                }`}
              />
              <motion.div
                layout
                className={`h-2.5 rounded-full transition-colors ${
                  step === "message"
                    ? "bg-primary w-12"
                    : "bg-primary/30 w-8 hover:bg-primary/50"
                }`}
              />
            </div>
            <Button
              variant="ghost"
              className="pointer-events-auto opacity-50 hover:opacity-100"
              onClick={() => setOpen(false)}
            >
              Skip
            </Button>
          </div>

          <div className="flex-1 flex items-center justify-center p-4">
            <AnimatePresence mode="wait">
              {step === "welcome" && (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="max-w-2xl w-full text-center space-y-8"
                >
                  <div className="space-y-4">
                    <motion.h1
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-4xl sm:text-6xl font-black tracking-tighter bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent pb-2"
                    >
                      Welcome to Simly.
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-xl sm:text-2xl text-muted-foreground font-light max-w-lg mx-auto"
                    >
                      Turn your Android phone into a powerful SMS Gateway in
                      just a few minutes.
                    </motion.p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left max-w-3xl mx-auto py-8">
                    {[
                      {
                        icon: ArrowRight,
                        title: "1. Connect",
                        desc: "Install our app and link your Android device securely.",
                      },
                      {
                        icon: MessageSquare,
                        title: "2. Send",
                        desc: "Use our API or Dashboard to send SMS instantly.",
                      },
                      {
                        icon: Check,
                        title: "3. Scale",
                        desc: "Add more devices to increase throughput.",
                      },
                    ].map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        whileHover={{ scale: 1.05, y: -5 }}
                        className="p-6 bg-card border rounded-2xl shadow-sm cursor-default transition-shadow hover:shadow-md"
                      >
                        <div className="size-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-4">
                          <item.icon className="size-5" />
                        </div>
                        <h3 className="font-bold mb-2">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.desc}
                        </p>
                      </motion.div>
                    ))}
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Button
                      size="lg"
                      className="h-14 px-10 text-lg font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                      onClick={() => setStep("connect")}
                    >
                      Get Started <ArrowRight className="ml-2 size-5" />
                    </Button>
                  </motion.div>
                </motion.div>
              )}

              {step === "connect" && (
                <motion.div
                  key="connect"
                  initial={{ opacity: 0, x: 50, filter: "blur(10px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -50, filter: "blur(10px)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="w-full max-w-md"
                >
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold tracking-tight mb-2">
                      Connect your Device
                    </h2>
                    <p className="text-muted-foreground">
                      Follow the steps to link your phone.
                    </p>
                  </div>

                  <div className="bg-card border rounded-2xl shadow-sm overflow-hidden transform transition-all hover:shadow-md">
                    <ConnectDeviceContent
                      onSuccess={handleConnectSuccess}
                      isDialog={false}
                    />
                  </div>
                </motion.div>
              )}

              {step === "message" && (
                <motion.div
                  key="message"
                  initial={{ opacity: 0, x: 50, filter: "blur(10px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -50, filter: "blur(10px)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="w-full max-w-lg"
                >
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold tracking-tight mb-2">
                      Send your first SMS
                    </h2>
                    <p className="text-muted-foreground">
                      Test the connection by sending a real message.
                    </p>
                  </div>

                  <div className="bg-card border rounded-2xl shadow-sm overflow-hidden h-[500px] flex flex-col transform transition-all hover:shadow-md">
                    <NewMessageForm
                      onSuccess={handleMessageSuccess}
                      hideTitle
                    />
                  </div>
                </motion.div>
              )}

              {step === "complete" && (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="text-center space-y-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 15,
                      delay: 0.2,
                    }}
                    className="size-32 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-600"
                  >
                    <Check className="size-16" />
                  </motion.div>
                  <div className="space-y-4">
                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-4xl font-bold tracking-tight"
                    >
                      You're all set!
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-xl text-muted-foreground max-w-md mx-auto"
                    >
                      You have successfully connected your device and sent your
                      first message.
                    </motion.p>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Button
                      size="lg"
                      className="h-14 px-10 text-lg font-bold rounded-full hover:scale-105 transition-transform"
                      onClick={handleComplete}
                    >
                      Go to Dashboard
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
