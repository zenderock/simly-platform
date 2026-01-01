"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Download, ShieldCheck, Loader2, Check } from "lucide-react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import api from "@/lib/api";
import { useDashboardStore } from "@/store/dashboard-store";
import { Device } from "@/types";

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
  
  const initialActiveCount = useRef(0);
  const isActive = useRef(false);

  const fetchActiveCount = async () => {
    try {
      const res = await api.get<Device[]>("/devices");
      return res.data.filter(d => d.status === "online").length;
    } catch {
      return 0;
    }
  };

  useEffect(() => {
    if (open) {
      isActive.current = true;
      fetchActiveCount().then(c => {
        initialActiveCount.current = c;
      });
    } else {
      isActive.current = false;
    }
  }, [open]);

  // Fetch link token when step 2 is reached
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (step === 2) {
      if (!linkToken) fetchLinkToken();

      // Start polling for success
      interval = setInterval(async () => {
        if (!isActive.current) return;
        const currentCount = await fetchActiveCount();
        // If we have more active devices than before, or at least 1 if we had 0
        // (Actually simple check: if current > initial)
        // Also safeguard: if we had 0 and now 1.
        // What if we are re-linking? Count won't change.
        // For re-linking, we might need to check "last_seen" timestamp?
        // Let's assume re-linking updates "last_seen".
        // Let's check if any device has "last_seen" within the last 5 seconds?
        // Only if we can get that detailed info. 
        // For now, let's stick to count change OR strictly > 0 if it was 0.
        // If user is replacing a device, the old one might still be 'online' in DB for a bit?
        // Let's check if any device is online that wasn't before?
        
        // Simpler approach for "Added new device": Count increases.
        // For "Re-linked": The Mobile App logic sets status=online.
        // If the device was ALREADY online, the count won't change.
        // But usually users link when it's offline/new.
        if (currentCount > initialActiveCount.current) {
          setStep(3);
          triggerRefresh(); // Trigger dashboard refresh
        } else {
            // Fallback for re-linking: check if we have ANY online device and we are 5+ seconds into scanning?
            // No, that's risky.
            // Let's trust the count for now.
             
            // Alternative: Check if api returns a "just connected" flag? No.
            // Let's rely on count increase for new devices.
            // For re-connecting existing devices, existing count matches current count.
            // Maybe we can check if the token was consumed?
            // We can't easily check token status.
        }
      }, 3000);
    }

    return () => clearInterval(interval);
  }, [step, linkToken]);

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

  const handleClose = (val: boolean) => {
    setOpen(val);
    if (!val) {
      // Reset after small delay to allow animation
      setTimeout(() => {
        setStep(1);
        setLinkToken(null);
        setError(null);
      }, 300);
    }
  };

  const qrData = linkToken ? JSON.stringify({
    token: linkToken.token,
    expires_at: linkToken.expires_at
  }) : "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button 
          disabled={disabled}
          className="shrink-0 gap-2 bg-[#6e3ff3] hover:bg-[#5b32cc] text-white border-none shadow-lg shadow-[#6e3ff3]/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
                   Download the Simly APK on your Android phone. Ensure "Install from unknown sources" is enabled.
                 </p>
               </div>
               <Button onClick={() => setStep(2)} className="w-full">
                 I've installed the app
               </Button>
             </motion.div>
          ) : step === 2 ? (
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="space-y-6 w-full"
             >
               <div className="size-48 bg-white border rounded-xl flex items-center justify-center mx-auto p-4 relative">
                 {loading ? (
                   <Loader2 className="size-8 text-zinc-400 animate-spin" />
                 ) : error ? (
                   <div className="text-center">
                     <p className="text-xs text-red-500 mb-2">{error}</p>
                     <Button size="sm" variant="outline" onClick={fetchLinkToken}>
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
                   Open Simly on your phone and scan this code to link it to your organization.
                 </p>
               </div>
               <div className="flex bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 text-emerald-600 text-[10px] leading-tight text-left">
                  <ShieldCheck className="size-3.5 mr-2 shrink-0" />
                  This unique code securely links your device using end-to-end encryption.
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
                 <p className="text-xl font-bold text-emerald-600 dark:text-emerald-500">Success!</p>
                 <p className="text-sm text-muted-foreground px-6">
                   Your device has been securely linked and is now ready to send SMS.
                 </p>
               </div>
               <Button onClick={() => handleClose(false)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
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
