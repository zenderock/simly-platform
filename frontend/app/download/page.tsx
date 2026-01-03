"use client";

import Link from "next/link";
import { ArrowRight, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";

export default function DownloadPage() {
  return (
    <div className="bg-[#05080A] min-h-screen flex flex-col text-white/70 font-sans selection:bg-[#6e3ff3]/30 selection:text-[#6e3ff3]">
      <Header />

      <main className="grow flex flex-col items-center justify-center relative overflow-hidden py-24 px-4 sm:px-6 lg:px-8">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#6e3ff3]/10 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#6e3ff3]/5 blur-[120px] rounded-full"></div>
        </div>

        <div className="relative z-10 max-w-2xl w-full text-center space-y-10">
          <div className="flex justify-center pt-8">
            <div className="w-24 h-24 bg-[#6e3ff3]/5 rounded-3xl flex items-center justify-center border border-[#6e3ff3]/20 shadow-[0_0_40px_rgba(110,63,243,0.15)] relative">
              <div className="absolute inset-0 bg-[#6e3ff3]/10 blur-xl rounded-full"></div>
              <Smartphone className="w-10 h-10 text-[#6e3ff3] relative z-10" />
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tighter text-white">
              Download <span className="text-[#6e3ff3]">Simly Gateway</span>
            </h1>
            <p className="text-lg text-white/60 leading-relaxed max-w-lg mx-auto font-light">
              Turn your Android phone into a powerful SMS gateway in minutes.
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-8 sm:p-10 text-left space-y-8 backdrop-blur-sm shadow-xl">
            <div className="flex items-start gap-5 group">
              <div className="w-10 h-10 rounded-full bg-[#15191E] border border-white/10 flex items-center justify-center text-white/90 font-medium shrink-0 group-hover:border-[#6e3ff3]/50 transition-colors">
                1
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-1">
                  Download the APK
                </h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  Get the latest version (v1.0) of the Simly Gateway app
                  designed for performance.
                </p>
              </div>
            </div>
            <div className="w-px h-8 bg-white/5 ml-5 -my-4"></div>
            <div className="flex items-start gap-5 group">
              <div className="w-10 h-10 rounded-full bg-[#15191E] border border-white/10 flex items-center justify-center text-white/90 font-medium shrink-0 group-hover:border-[#6e3ff3]/50 transition-colors">
                2
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-1">
                  Install on Android
                </h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  Open the file and allow installation from unknown sources if
                  prompted by your device.
                </p>
              </div>
            </div>
            <div className="w-px h-8 bg-white/5 ml-5 -my-4"></div>
            <div className="flex items-start gap-5 group">
              <div className="w-10 h-10 rounded-full bg-[#15191E] border border-white/10 flex items-center justify-center text-white/90 font-medium shrink-0 group-hover:border-[#6e3ff3]/50 transition-colors">
                3
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-1">
                  Scan QR Code
                </h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  Open the app and scan the QR code from your dashboard to
                  securely link your device.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a
              href="/releases/simly-gateway-v1.apk"
              className="w-full sm:w-auto"
            >
              <Button
                size="lg"
                className="w-full sm:min-w-[200px] bg-[#6e3ff3] hover:bg-[#5b32d1] text-white gap-2 h-14 text-sm uppercase tracking-wide font-medium rounded-sm"
              >
                <Download className="w-4 h-4" />
                Download APK (v1.0)
              </Button>
            </a>
            <Link href="/register" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:min-w-[200px] border-white/10 hover:bg-white/5 text-white gap-2 h-14 text-sm uppercase tracking-wide font-medium bg-transparent rounded-sm"
              >
                Create Account
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <p className="text-white/30 text-xs uppercase tracking-widest">
            Requires Android 8.0 or higher
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
