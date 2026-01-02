"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Download, ShieldCheck, Loader2, Check } from "lucide-react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import api from "@/lib/api";
import { useDashboardStore } from "@/store/dashboard-store";
import { Device } from "@/types";
import LoaderQuater from "../loader";

interface LinkToken {
  token: string;
  expires_at: string;
}

interface ConnectDeviceDialogProps {
  disabled?: boolean;
}

export function ConnectDeviceDialog({ disabled }: ConnectDeviceDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [linkToken, setLinkToken] = useState<LinkToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRefresh = useDashboardStore((state) => state.triggerRefresh);

  // Fetch link token when entering step 2
  useEffect(() => {
    if (step === 2 && !linkToken) {
      fetchLinkToken();
    }
  }, [step]);

  // Poll for token status
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (step === 2 && linkToken) {
      interval = setInterval(async () => {
        try {
          const res = await api.get<{
            status: string;
            device_id?: string;
            device_name?: string;
          }>(`/devices/link-token/${linkToken.token}`);
          if (res.data.status === "success") {
            setStep(3);
            triggerRefresh();
          } else if (res.data.status === "expired") {
            setError("QR Code expired. Please retry.");
            setLinkToken(null);
          }
        } catch (e) {
          // Ignore polling errors
        }
      }, 2000);
    }

    return () => clearInterval(interval);
  }, [step, linkToken, triggerRefresh]);

  const fetchLinkToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<LinkToken>("/devices/link-token");
      setLinkToken(res.data);
    } catch (err) {
      setError("Failed to generate QR code. Please try again.");
      console.error("Failed to generate link token:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkInitialStep = () => {
    const hasDownloaded =
      localStorage.getItem("simly_app_downloaded") === "true";
    setStep(hasDownloaded ? 2 : 1);
  };

  const handleOpen = (val: boolean) => {
    if (val) {
      checkInitialStep();
    }
    setOpen(val);
    if (!val) {
      // Reset after small delay to allow animation
      setTimeout(() => {
        setLinkToken(null);
        setError(null);
      }, 300);
    }
  };

  const handleDownload = () => {
    localStorage.setItem("simly_app_downloaded", "true");
    window.location.href = "/releases/simly-gateway-v1.apk";
    setStep(2);
  };

  const qrData = linkToken
    ? JSON.stringify({
        token: linkToken.token,
        expires_at: linkToken.expires_at,
      })
    : "";

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={disabled}
          className="shrink-0 gap-2 bg-black hover:bg-neutral-800 text-white border-none shadow-lg shadow-black/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="size-4" />
          Add a Device
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Connect New Device</DialogTitle>
          <DialogDescription>
            Turn your Android phone into an SMS Gateway in 2 minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 min-h-[300px] flex flex-col items-center justify-center text-center">
          {step === 1 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                <Download className="size-8 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold">Step 1: Download the App</p>
                <p className="text-sm text-muted-foreground px-6">
                  Download the Simly APK on your Android phone. Ensure "Install
                  from unknown sources" is enabled.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleDownload}
                  className="w-full h-11 font-bold"
                >
                  <Download className="size-4 mr-2" />
                  Download APK
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(2)}
                  className="text-xs text-muted-foreground"
                >
                  I've already installed the app
                </Button>
              </div>
            </motion.div>
          ) : step === 2 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 w-full"
            >
              <div className="size-48 bg-white border rounded-xl flex items-center justify-center mx-auto p-4 relative">
                {loading ? (
                  <LoaderQuater className="size-8 text-zinc-400 " />
                ) : error ? (
                  <div className="text-center">
                    <p className="text-xs text-red-500 mb-2">{error}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={fetchLinkToken}
                    >
                      Retry
                    </Button>
                  </div>
                ) : linkToken ? (
                  <QRCodeSVG
                    value={qrData}
                    size={160}
                    level="M"
                    includeMargin={false}
                  />
                ) : null}
              </div>
              <div className="space-y-2">
                <p className="font-semibold">Step 2: Scan QR Code</p>
                <p className="text-sm text-muted-foreground px-6">
                  Open Simly on your phone and scan this code to link it to your
                  organization.
                </p>
              </div>
              <div className="flex bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 text-emerald-600 text-[10px] leading-tight text-left">
                <ShieldCheck className="size-3.5 mr-2 shrink-0" />
                This unique code securely links your device using end-to-end
                encryption.
              </div>
            </motion.div>
          ) : step === 3 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="size-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-500">
                <Check className="size-10" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-500">
                  Success!
                </p>
                <p className="text-sm text-muted-foreground px-6">
                  Your device has been securely linked and is now ready to send
                  SMS.
                </p>
              </div>
              <Button
                onClick={() => handleOpen(false)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Done
              </Button>
            </motion.div>
          ) : null}
        </div>

        {step === 2 && (
          <DialogFooter className="sm:justify-start">
            <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
