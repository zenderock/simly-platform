"use client";

import { useState } from "react";
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
import { Plus, Smartphone, QrCode, Download, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export function ConnectDeviceDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) setStep(1);
    }}>
      <DialogTrigger asChild>
        <Button className="shrink-0 gap-2 bg-[#6e3ff3] hover:bg-[#5b32cc] text-white border-none shadow-lg shadow-[#6e3ff3]/20">
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
               <div className="size-48 bg-white border rounded-xl flex items-center justify-center mx-auto p-4">
                 {/* This would be a real QR code in production */}
                 <QrCode className="size-full text-zinc-300" />
                 <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-xl">
                   <p className="text-xs font-mono font-bold text-zinc-600 bg-white border px-2 py-1 rounded shadow-sm">QR_CODE_GEN_PENDING</p>
                 </div>
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
          ) : null}
        </div>

        {step > 1 && (
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
